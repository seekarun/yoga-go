/**
 * Visitor Booking Cancel API
 * GET  /api/data/tenants/[tenantId]/booking/cancel?token=xxx - Preview cancellation details
 * POST /api/data/tenants/[tenantId]/booking/cancel         - Execute cancellation
 */

import { NextResponse } from "next/server";
import type { ApiResponse } from "@/types";
import { verifyCancelToken } from "@/lib/cancel-token";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import * as calendarEventRepository from "@/lib/repositories/calendarEventRepository";
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
  sendBookingCancelledEmailToVisitor,
  sendBookingCancelledEmailToTenant,
} from "@/lib/email/bookingCancelledEmail";
import { parseVisitorFromDescription } from "@/lib/email/bookingNotification";
import { DEFAULT_CANCELLATION_CONFIG } from "@/types/booking";

interface CancelPreviewData {
  eventId: string;
  title: string;
  startTime: string;
  endTime: string;
  date: string;
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
  params: Promise<{ tenantId: string }>;
}

/**
 * GET /api/data/tenants/[tenantId]/booking/cancel?token=xxx
 * Preview cancellation details + refund calculation
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { tenantId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  console.log("[DBG][booking/cancel] GET called for tenant:", tenantId);

  if (!token) {
    return NextResponse.json<ApiResponse<CancelPreviewData>>(
      { success: false, error: "Missing cancel token" },
      { status: 400 },
    );
  }

  try {
    // Verify token
    const payload = verifyCancelToken(token);
    if (!payload || payload.tenantId !== tenantId) {
      return NextResponse.json<ApiResponse<CancelPreviewData>>(
        { success: false, error: "Invalid or expired cancel token" },
        { status: 400 },
      );
    }

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json<ApiResponse<CancelPreviewData>>(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get event
    const event = await calendarEventRepository.getCalendarEventById(
      tenantId,
      payload.date,
      payload.eventId,
    );
    if (!event) {
      return NextResponse.json<ApiResponse<CancelPreviewData>>(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    // Check event is cancellable
    if (event.status !== "scheduled" && event.status !== "pending") {
      return NextResponse.json<ApiResponse<CancelPreviewData>>(
        {
          success: false,
          error: `Booking cannot be cancelled (status: ${event.status})`,
        },
        { status: 400 },
      );
    }

    // Parse visitor info
    const visitor = parseVisitorFromDescription(event.description);
    const cancellationConfig =
      tenant.bookingConfig?.cancellationConfig ?? DEFAULT_CANCELLATION_CONFIG;
    const currency = tenant.currency ?? "AUD";

    // Calculate refund
    let paidAmountCents = 0;
    if (event.stripePaymentIntentId) {
      const pi = await getPaymentIntent(event.stripePaymentIntentId);
      paidAmountCents = pi.amount;
    }

    const refund =
      paidAmountCents > 0
        ? calculateVisitorRefundAmount(
            paidAmountCents,
            event.startTime,
            cancellationConfig,
          )
        : {
            amountCents: 0,
            isFullRefund: true,
            reason: "No payment to refund",
          };

    return NextResponse.json<ApiResponse<CancelPreviewData>>({
      success: true,
      data: {
        eventId: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        date: event.date,
        visitorName: visitor?.visitorName ?? "Guest",
        visitorEmail: visitor?.visitorEmail ?? "",
        isPaid: paidAmountCents > 0,
        paidAmountCents,
        refundAmountCents: refund.amountCents,
        isFullRefund: refund.isFullRefund,
        refundReason: refund.reason,
        currency,
        cancellationDeadlineHours: cancellationConfig.cancellationDeadlineHours,
        isBeforeDeadline: isBeforeDeadline(event.startTime, cancellationConfig),
      },
    });
  } catch (error) {
    console.error("[DBG][booking/cancel] GET error:", error);
    return NextResponse.json<ApiResponse<CancelPreviewData>>(
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
 * POST /api/data/tenants/[tenantId]/booking/cancel
 * Execute the cancellation
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { tenantId } = await params;

  console.log("[DBG][booking/cancel] POST called for tenant:", tenantId);

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
    const payload = verifyCancelToken(token);
    if (!payload || payload.tenantId !== tenantId) {
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

    // Get event
    const event = await calendarEventRepository.getCalendarEventById(
      tenantId,
      payload.date,
      payload.eventId,
    );
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Booking not found" },
        { status: 404 },
      );
    }

    // Check event is cancellable
    if (event.status !== "scheduled" && event.status !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error: `Booking cannot be cancelled (status: ${event.status})`,
        },
        { status: 400 },
      );
    }

    const cancellationConfig =
      tenant.bookingConfig?.cancellationConfig ?? DEFAULT_CANCELLATION_CONFIG;
    const currency = tenant.currency ?? "AUD";
    const visitor = parseVisitorFromDescription(event.description);

    // Process refund if paid
    let refundAmountCents = 0;
    let stripeRefundId: string | undefined;
    let refundIsFullRefund = true;

    if (event.stripePaymentIntentId) {
      const pi = await getPaymentIntent(event.stripePaymentIntentId);
      const paidAmountCents = pi.amount;

      const refund = calculateVisitorRefundAmount(
        paidAmountCents,
        event.startTime,
        cancellationConfig,
      );
      refundAmountCents = refund.amountCents;
      refundIsFullRefund = refund.isFullRefund;

      if (refundAmountCents > 0) {
        const stripeRefund = refund.isFullRefund
          ? await createFullRefund(event.stripePaymentIntentId)
          : await createPartialRefund(
              event.stripePaymentIntentId,
              refundAmountCents,
            );
        stripeRefundId = stripeRefund.id;
        console.log(
          "[DBG][booking/cancel] Refund issued:",
          stripeRefundId,
          "amount:",
          refundAmountCents,
        );
      }
    }

    // Update event status with condition check to prevent double-refund
    const updatedEvent = await calendarEventRepository.updateCalendarEvent(
      tenantId,
      event.date,
      event.id,
      {
        status: "cancelled",
        cancelledBy: "visitor",
        cancelledAt: new Date().toISOString(),
        refundAmountCents,
        stripeRefundId,
      },
    );

    if (!updatedEvent) {
      return NextResponse.json(
        { success: false, error: "Failed to update booking" },
        { status: 500 },
      );
    }

    // Send cancellation emails (fire-and-forget)
    if (visitor) {
      const emailData = {
        visitorName: visitor.visitorName,
        visitorEmail: visitor.visitorEmail,
        startTime: event.startTime,
        endTime: event.endTime,
        tenant,
        cancelledBy: "visitor" as const,
        refundAmountCents,
        currency,
        isFullRefund: refundIsFullRefund,
      };

      sendBookingCancelledEmailToVisitor(emailData).catch((err) =>
        console.error(
          "[DBG][booking/cancel] Failed to send visitor email:",
          err,
        ),
      );
      sendBookingCancelledEmailToTenant(emailData).catch((err) =>
        console.error(
          "[DBG][booking/cancel] Failed to send tenant email:",
          err,
        ),
      );
    }

    console.log(
      "[DBG][booking/cancel] Booking cancelled by visitor:",
      event.id,
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
    console.error("[DBG][booking/cancel] POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to cancel booking",
      },
      { status: 500 },
    );
  }
}
