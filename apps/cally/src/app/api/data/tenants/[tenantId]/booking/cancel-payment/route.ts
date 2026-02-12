/**
 * POST /api/data/tenants/[tenantId]/booking/cancel-payment
 * Public endpoint to cancel a pending payment and free the reserved slot
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getCalendarEventById,
  deleteCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import { expireCheckoutSession } from "@/lib/stripe";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    const body = (await request.json()) as {
      eventId: string;
      date: string;
      checkoutSessionId: string;
    };

    const { eventId, date, checkoutSessionId } = body;

    if (!eventId || !date || !checkoutSessionId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    console.log(
      `[DBG][cancel-payment] Cancelling payment: tenant=${tenantId} event=${eventId}`,
    );

    // Verify the event exists and is in pending_payment status
    const event = await getCalendarEventById(tenantId, date, eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 },
      );
    }

    if (event.status !== "pending_payment") {
      console.log(
        `[DBG][cancel-payment] Event not in pending_payment status: ${event.status}`,
      );
      return NextResponse.json(
        { success: false, error: "Event is not in pending payment status" },
        { status: 400 },
      );
    }

    // Expire the Stripe Checkout Session
    try {
      await expireCheckoutSession(checkoutSessionId);
      console.log(
        `[DBG][cancel-payment] Expired checkout session: ${checkoutSessionId}`,
      );
    } catch (err) {
      // Session may already be expired — that's fine
      console.warn(
        "[DBG][cancel-payment] Could not expire checkout session:",
        err,
      );
    }

    // Delete the pending_payment event to free the slot
    await deleteCalendarEvent(tenantId, date, eventId);
    console.log(
      `[DBG][cancel-payment] Deleted pending_payment event: ${eventId}`,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][cancel-payment] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
