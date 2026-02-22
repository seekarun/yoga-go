/**
 * Visitor Webinar Cancel API
 * GET  /api/data/tenants/[tenantId]/webinar/[productId]/cancel?token=xxx - Preview cancellation details
 * POST /api/data/tenants/[tenantId]/webinar/[productId]/cancel         - Execute cancellation
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { verifyWebinarCancelToken } from "@/lib/cancel-token";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import { getProductById } from "@/lib/repositories/productRepository";
import {
  getWebinarSignup,
  deleteWebinarSignup,
} from "@/lib/repositories/webinarSignupRepository";
import {
  getCalendarEventsByRecurrenceGroup,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import {
  calculateVisitorRefundAmount,
  isBeforeDeadline,
} from "@/lib/booking/cancellation";
import {
  getPaymentIntent,
  createFullRefund,
  createPartialRefund,
} from "@/lib/stripe";
import {
  sendWebinarCancelledEmailToVisitor,
  sendWebinarCancelledEmailToTenant,
} from "@/lib/email/webinarCancelledEmail";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import { DEFAULT_CANCELLATION_CONFIG } from "@/types/booking";
import {
  getNextWaitingWebinarEntry,
  updateWebinarWaitlistEntry,
} from "@/lib/repositories/webinarWaitlistRepository";
import { sendWebinarWaitlistSlotAvailableEmail } from "@/lib/email/webinarWaitlistEmail";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";
import type { Product } from "@/types";

interface WebinarCancelPreviewData {
  productId: string;
  webinarName: string;
  sessions: { date: string; startTime: string; endTime: string }[];
  visitorName: string;
  visitorEmail: string;
  isPaid: boolean;
  paidAmountCents: number;
  refundAmountCents: number;
  isFullRefund: boolean;
  refundReason: string;
  currency: string;
  cancellationDeadlineHours: number;
  isBeforeDeadline: boolean;
}

interface RouteParams {
  params: Promise<{ tenantId: string; productId: string }>;
}

/**
 * GET /api/data/tenants/[tenantId]/webinar/[productId]/cancel?token=xxx
 * Preview cancellation details + refund calculation
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { tenantId, productId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  console.log(
    "[DBG][webinar/cancel] GET called for tenant:",
    tenantId,
    "product:",
    productId,
  );

  if (!token) {
    return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>(
      { success: false, error: "Missing cancel token" },
      { status: 400 },
    );
  }

  try {
    // Verify token
    const payload = verifyWebinarCancelToken(token);
    if (
      !payload ||
      payload.tenantId !== tenantId ||
      payload.productId !== productId
    ) {
      return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>(
        { success: false, error: "Invalid or expired cancel token" },
        { status: 400 },
      );
    }

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get product and verify it is a webinar
    const product = await getProductById(tenantId, productId);
    if (!product || product.productType !== "webinar" || !product.isActive) {
      return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>(
        { success: false, error: "Webinar not found or inactive" },
        { status: 404 },
      );
    }

    // Get signup
    const signup = await getWebinarSignup(tenantId, productId, payload.email);
    if (!signup) {
      return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>(
        { success: false, error: "Signup not found" },
        { status: 404 },
      );
    }

    const cancellationConfig =
      tenant.bookingConfig?.cancellationConfig ?? DEFAULT_CANCELLATION_CONFIG;
    const currency = tenant.currency ?? "AUD";
    const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";

    // Calculate refund
    let paidAmountCents = 0;
    if (signup.stripePaymentIntentId) {
      const pi = await getPaymentIntent(signup.stripePaymentIntentId);
      paidAmountCents = pi.amount;
    }

    // Expand sessions and determine first session start time
    const sessions = product.webinarSchedule
      ? expandWebinarSessions(product.webinarSchedule, timezone)
      : [];
    const firstSessionStartTime =
      sessions.length > 0 ? sessions[0].startTime : new Date().toISOString();

    const refund =
      paidAmountCents > 0
        ? calculateVisitorRefundAmount(
            paidAmountCents,
            firstSessionStartTime,
            cancellationConfig,
          )
        : {
            amountCents: 0,
            isFullRefund: true,
            reason: "No payment to refund",
          };

    return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>({
      success: true,
      data: {
        productId,
        webinarName: product.name,
        sessions: sessions.map((s) => ({
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
        })),
        visitorName: signup.visitorName,
        visitorEmail: signup.visitorEmail,
        isPaid: paidAmountCents > 0,
        paidAmountCents,
        refundAmountCents: refund.amountCents,
        isFullRefund: refund.isFullRefund,
        refundReason: refund.reason,
        currency,
        cancellationDeadlineHours: cancellationConfig.cancellationDeadlineHours,
        isBeforeDeadline: isBeforeDeadline(
          firstSessionStartTime,
          cancellationConfig,
        ),
      },
    });
  } catch (error) {
    console.error("[DBG][webinar/cancel] GET error:", error);
    return NextResponse.json<ApiResponse<WebinarCancelPreviewData>>(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load cancellation details",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/data/tenants/[tenantId]/webinar/[productId]/cancel
 * Execute the cancellation
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { tenantId, productId } = await params;

  console.log(
    "[DBG][webinar/cancel] POST called for tenant:",
    tenantId,
    "product:",
    productId,
  );

  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Missing cancel token" },
        { status: 400 },
      );
    }

    // Verify token
    const payload = verifyWebinarCancelToken(token);
    if (
      !payload ||
      payload.tenantId !== tenantId ||
      payload.productId !== productId
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired cancel token" },
        { status: 400 },
      );
    }

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get product and verify it is a webinar
    const product = await getProductById(tenantId, productId);
    if (!product || product.productType !== "webinar" || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Webinar not found or inactive" },
        { status: 404 },
      );
    }

    // Get signup
    const email = payload.email;
    const signup = await getWebinarSignup(tenantId, productId, email);
    if (!signup) {
      return NextResponse.json(
        { success: false, error: "Signup not found" },
        { status: 404 },
      );
    }

    const cancellationConfig =
      tenant.bookingConfig?.cancellationConfig ?? DEFAULT_CANCELLATION_CONFIG;
    const currency = tenant.currency ?? "AUD";
    const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";

    // Expand sessions and determine first session start time
    const sessions = product.webinarSchedule
      ? expandWebinarSessions(product.webinarSchedule, timezone)
      : [];
    const firstSessionStartTime =
      sessions.length > 0 ? sessions[0].startTime : new Date().toISOString();

    // Process refund if paid
    let refundAmountCents = 0;
    let stripeRefundId: string | undefined;
    let refundIsFullRefund = true;

    if (signup.stripePaymentIntentId) {
      const pi = await getPaymentIntent(signup.stripePaymentIntentId);
      const paidAmountCents = pi.amount;

      const refund = calculateVisitorRefundAmount(
        paidAmountCents,
        firstSessionStartTime,
        cancellationConfig,
      );
      refundAmountCents = refund.amountCents;
      refundIsFullRefund = refund.isFullRefund;

      if (refundAmountCents > 0) {
        const stripeRefund = refund.isFullRefund
          ? await createFullRefund(signup.stripePaymentIntentId)
          : await createPartialRefund(
              signup.stripePaymentIntentId,
              refundAmountCents,
            );
        stripeRefundId = stripeRefund.id;
        console.log(
          "[DBG][webinar/cancel] Refund issued:",
          stripeRefundId,
          "amount:",
          refundAmountCents,
        );
      }
    }

    // Remove attendee from all session calendar events
    const sessionEvents = await getCalendarEventsByRecurrenceGroup(
      tenantId,
      productId,
    );
    for (const event of sessionEvents) {
      const existingAttendees = event.attendees || [];
      const filteredAttendees = existingAttendees.filter(
        (a) => a.email.toLowerCase() !== email.toLowerCase(),
      );
      if (filteredAttendees.length !== existingAttendees.length) {
        await updateCalendarEvent(tenantId, event.date, event.id, {
          attendees: filteredAttendees,
        });
      }
    }

    // Delete the signup record
    await deleteWebinarSignup(tenantId, productId, email);

    console.log(
      "[DBG][webinar/cancel] Signup deleted for:",
      email,
      "product:",
      productId,
    );

    // Build session info for email (HH:mm format expected by email template)
    const schedSessions = product.webinarSchedule?.sessions ?? [];
    const emailSessions = sessions.map((s, i) => ({
      date: s.date,
      startTime: schedSessions[i]?.startTime ?? "",
      endTime: schedSessions[i]?.endTime ?? "",
    }));

    // Send cancellation emails (fire-and-forget)
    const emailData = {
      visitorName: signup.visitorName,
      visitorEmail: signup.visitorEmail,
      webinarName: product.name,
      sessions: emailSessions,
      tenant,
      cancelledBy: "visitor" as const,
      refundAmountCents,
      currency,
      isFullRefund: refundIsFullRefund,
    };

    sendWebinarCancelledEmailToVisitor(emailData).catch((err) =>
      console.error("[DBG][webinar/cancel] Failed to send visitor email:", err),
    );
    sendWebinarCancelledEmailToTenant(emailData).catch((err) =>
      console.error("[DBG][webinar/cancel] Failed to send tenant email:", err),
    );

    // Notify next person on webinar waitlist (fire-and-forget)
    notifyNextWebinarWaitlistEntry(tenantId, productId, product, tenant).catch(
      (err) =>
        console.error("[DBG][webinar/cancel] Failed to notify waitlist:", err),
    );

    console.log(
      "[DBG][webinar/cancel] Webinar signup cancelled by visitor:",
      email,
    );

    return NextResponse.json({
      success: true,
      data: {
        cancelled: true,
        refundAmountCents,
        stripeRefundId,
      },
    });
  } catch (error) {
    console.error("[DBG][webinar/cancel] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel webinar signup",
      },
      { status: 500 },
    );
  }
}

/**
 * Notify the next waiting person on the webinar waitlist after a cancellation.
 */
async function notifyNextWebinarWaitlistEntry(
  tenantId: string,
  productId: string,
  product: Product,
  tenant: CallyTenant,
): Promise<void> {
  if (!tenant) return;

  const nextEntry = await getNextWaitingWebinarEntry(tenantId, productId);
  if (!nextEntry) {
    console.log(
      "[DBG][webinar/cancel] No waitlist entries for product:",
      productId,
    );
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  await updateWebinarWaitlistEntry(tenantId, productId, nextEntry.id, {
    status: "notified",
    notifiedAt: now.toISOString(),
    expiresAt,
  });

  const landingPageUrl = getLandingPageUrl(tenant);
  const signupUrl = `${landingPageUrl}/webinar/${productId}`;

  await sendWebinarWaitlistSlotAvailableEmail({
    visitorName: nextEntry.visitorName,
    visitorEmail: nextEntry.visitorEmail,
    webinarName: product.name,
    tenant,
    signupUrl,
  });

  console.log(
    `[DBG][webinar/cancel] Notified waitlist entry ${nextEntry.id} (${nextEntry.visitorEmail}) for product ${productId}`,
  );
}
