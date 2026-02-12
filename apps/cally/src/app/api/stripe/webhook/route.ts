/**
 * POST /api/stripe/webhook
 * Public Stripe webhook endpoint — handles checkout session events
 */
import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  getCalendarEventById,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import {
  sendBookingNotificationEmail,
  parseVisitorFromDescription,
} from "@/lib/email/bookingNotification";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("[DBG][stripe/webhook] POST called");

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      console.error("[DBG][stripe/webhook] Missing stripe-signature header");
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 },
      );
    }

    let event: Stripe.Event;
    try {
      event = constructWebhookEvent(body, signature);
    } catch (err) {
      console.error(
        "[DBG][stripe/webhook] Signature verification failed:",
        err,
      );
      return NextResponse.json(
        { error: "Webhook signature verification failed" },
        { status: 400 },
      );
    }

    console.log("[DBG][stripe/webhook] Event type:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutExpired(session);
        break;
      }
      default:
        console.log("[DBG][stripe/webhook] Unhandled event type:", event.type);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[DBG][stripe/webhook] Error:", error);
    return NextResponse.json({ received: true });
  }
}

/**
 * Handle checkout.session.completed — confirm the booking
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { tenantId, eventId, date } = session.metadata || {};

  if (!tenantId || !eventId || !date) {
    console.error(
      "[DBG][stripe/webhook] Missing metadata in checkout session:",
      session.id,
    );
    return;
  }

  console.log(
    `[DBG][stripe/webhook] Checkout completed: tenant=${tenantId} event=${eventId} date=${date}`,
  );

  // Update event status to "pending" and store payment intent ID
  const updatedEvent = await updateCalendarEvent(tenantId, date, eventId, {
    status: "pending",
    stripePaymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
  });

  if (!updatedEvent) {
    console.error("[DBG][stripe/webhook] Event not found for update:", eventId);
    return;
  }

  // Send booking notification email
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.error(
      "[DBG][stripe/webhook] Tenant not found for email:",
      tenantId,
    );
    return;
  }

  const visitor = parseVisitorFromDescription(updatedEvent.description);
  if (visitor) {
    await sendBookingNotificationEmail({
      visitorName: visitor.visitorName,
      visitorEmail: visitor.visitorEmail,
      note: visitor.note,
      startTime: updatedEvent.startTime,
      endTime: updatedEvent.endTime,
      date: updatedEvent.date,
      tenant,
    });
  }

  console.log(`[DBG][stripe/webhook] Booking confirmed for event ${eventId}`);
}

/**
 * Handle checkout.session.expired — free the reserved slot
 */
async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { tenantId, eventId, date } = session.metadata || {};

  if (!tenantId || !eventId || !date) {
    console.error(
      "[DBG][stripe/webhook] Missing metadata in expired session:",
      session.id,
    );
    return;
  }

  console.log(
    `[DBG][stripe/webhook] Checkout expired: tenant=${tenantId} event=${eventId} date=${date}`,
  );

  // Verify the event is still in pending_payment status before deleting
  const event = await getCalendarEventById(tenantId, date, eventId);
  if (!event) {
    console.log("[DBG][stripe/webhook] Event already deleted:", eventId);
    return;
  }

  if (event.status !== "pending_payment") {
    console.log(
      "[DBG][stripe/webhook] Event not in pending_payment status, skipping:",
      event.status,
    );
    return;
  }

  await deleteCalendarEvent(tenantId, date, eventId);
  console.log(
    `[DBG][stripe/webhook] Deleted expired pending_payment event: ${eventId}`,
  );
}
