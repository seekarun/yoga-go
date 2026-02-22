/**
 * POST /api/data/tenants/[tenantId]/webinar/[productId]/signup
 * Public endpoint — visitor signs up for a webinar
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import { getProductById } from "@/lib/repositories/productRepository";
import {
  createWebinarSignup,
  countWebinarSignups,
} from "@/lib/repositories/webinarSignupRepository";
import {
  getCalendarEventsByRecurrenceGroup,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import { isValidEmail } from "@core/lib/email/validator";
import { checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";
import { createCheckoutSession } from "@/lib/stripe";
import { getLandingPageUrl } from "@/lib/email/bookingNotification";
import { buildWebinarCancelUrl } from "@/lib/cancel-token";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import { sendWebinarSignupConfirmationEmail } from "@/lib/email/webinarSignupEmail";
import type { WebinarSignup, EventAttendee } from "@/types";

interface RouteParams {
  params: Promise<{ tenantId: string; productId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId, productId } = await params;

  try {
    console.log(
      `[DBG][webinarSignup] Signup attempt for webinar ${productId} tenant ${tenantId}`,
    );

    // Spam protection
    const body = await request.json();
    const spamCheck = await checkSpamProtection(
      request.headers,
      body as Record<string, unknown>,
      { tableName: Tables.CORE },
    );
    if (!spamCheck.passed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const { visitorName, visitorEmail, note } = body;

    // Validate required fields
    if (!visitorName || !visitorEmail) {
      return NextResponse.json(
        { success: false, error: "Name and email are required" },
        { status: 400 },
      );
    }

    // Validate email
    const emailValidation = await isValidEmail(visitorEmail);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 },
      );
    }

    // Get product and verify it's a webinar
    const product = await getProductById(tenantId, productId);
    if (!product || product.productType !== "webinar" || !product.isActive) {
      return NextResponse.json(
        { success: false, error: "Webinar not found" },
        { status: 404 },
      );
    }

    // Check capacity
    if (product.maxParticipants) {
      const currentCount = await countWebinarSignups(tenantId, productId);
      if (currentCount >= product.maxParticipants) {
        return NextResponse.json(
          {
            success: false,
            error: "This webinar is full",
            waitlistAvailable: true,
          },
          { status: 409 },
        );
      }
    }

    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check if paid webinar
    const requiresPayment =
      product.price > 0 && tenant.stripeConfig?.chargesEnabled;

    // Create signup record
    const signup: WebinarSignup = {
      productId,
      visitorName: visitorName.trim(),
      visitorEmail: visitorEmail.toLowerCase().trim(),
      signedUpAt: new Date().toISOString(),
      paymentStatus: requiresPayment ? "pending_payment" : "free",
    };

    try {
      await createWebinarSignup(tenantId, signup);
    } catch (error) {
      if (error instanceof Error && error.message === "ALREADY_SIGNED_UP") {
        return NextResponse.json(
          {
            success: false,
            error: "You are already signed up for this webinar",
          },
          { status: 409 },
        );
      }
      throw error;
    }

    // For paid webinars, create Stripe checkout
    if (requiresPayment && tenant.stripeConfig) {
      const feePercent =
        Number(process.env.STRIPE_APPLICATION_FEE_PERCENT) || 0;
      const applicationFeeAmount = Math.round(
        (product.price * feePercent) / 100,
      );

      const baseUrl = getLandingPageUrl(tenant);
      const returnUrl = `${baseUrl}/booking/success?session_id={CHECKOUT_SESSION_ID}&webinar=${productId}`;

      const checkoutSession = await createCheckoutSession({
        connectedAccountId: tenant.stripeConfig.accountId,
        currency: tenant.currency || "aud",
        unitAmount: product.price,
        productName: product.name,
        tenantName: tenant.name,
        applicationFeeAmount,
        customerEmail: visitorEmail,
        returnUrl,
        metadata: {
          tenantId,
          productId,
          visitorName,
          visitorEmail,
          type: "webinar_signup",
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          signedUp: true,
          requiresPayment: true,
          clientSecret: checkoutSession.client_secret,
          checkoutSessionId: checkoutSession.id,
        },
      });
    }

    // Free webinar — add attendee to all session events
    const sessionEvents = await getCalendarEventsByRecurrenceGroup(
      tenantId,
      productId,
    );

    const newAttendee: EventAttendee = {
      email: visitorEmail.toLowerCase().trim(),
      name: visitorName.trim(),
    };

    for (const event of sessionEvents) {
      const existingAttendees = event.attendees || [];
      await updateCalendarEvent(tenantId, event.date, event.id, {
        attendees: [...existingAttendees, newAttendee],
      });
    }

    // Suppress unused variable warning — note is accepted in body but not stored directly
    void note;

    // Send confirmation email (fire-and-forget)
    const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
    const cancelUrl = buildWebinarCancelUrl(tenant, {
      tenantId,
      productId,
      email: signup.visitorEmail,
    });
    const sessions = expandWebinarSessions(product.webinarSchedule!, timezone);

    sendWebinarSignupConfirmationEmail({
      visitorName: signup.visitorName,
      visitorEmail: signup.visitorEmail,
      webinarName: product.name,
      sessions: sessions.map((s, i) => ({
        date: s.date,
        startTime: product.webinarSchedule!.sessions[i]?.startTime ?? "",
        endTime: product.webinarSchedule!.sessions[i]?.endTime ?? "",
      })),
      tenant,
      cancelUrl,
      timezone,
    }).catch((err) =>
      console.error(
        "[DBG][webinarSignup] Failed to send confirmation email:",
        err,
      ),
    );

    return NextResponse.json({
      success: true,
      data: {
        signedUp: true,
        requiresPayment: false,
        sessionCount: sessionEvents.length,
      },
    });
  } catch (error) {
    console.error("[DBG][webinarSignup] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process signup" },
      { status: 500 },
    );
  }
}
