/**
 * POST /api/stripe/webhook
 * Public Stripe webhook endpoint — handles checkout session events
 */
import { NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  getCalendarEventById,
  getCalendarEventsByRecurrenceGroup,
  updateCalendarEvent,
  deleteCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import {
  sendBookingNotificationEmail,
  parseVisitorFromDescription,
} from "@/lib/email/bookingNotification";
import {
  updateWebinarSignupPayment,
  getWebinarSignup,
  deleteWebinarSignup,
} from "@/lib/repositories/webinarSignupRepository";
import { getProductById } from "@/lib/repositories/productRepository";
import { buildWebinarCancelUrl } from "@/lib/cancel-token";
import { expandWebinarSessions } from "@/lib/webinar/schedule";
import { sendWebinarSignupConfirmationEmail } from "@/lib/email/webinarSignupEmail";
import type Stripe from "stripe";
import type { EventAttendee } from "@/types";

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
 * Handle checkout.session.completed — confirm the booking or webinar signup
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const metadataType = session.metadata?.type;

  if (metadataType === "webinar_signup") {
    await handleWebinarCheckoutCompleted(session);
    return;
  }

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
 * Handle checkout.session.expired — free the reserved slot or webinar signup
 */
async function handleCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const metadataType = session.metadata?.type;

  if (metadataType === "webinar_signup") {
    await handleWebinarCheckoutExpired(session);
    return;
  }

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

/**
 * Handle checkout.session.completed for webinar signups
 * Updates payment status, adds attendee to calendar events, sends confirmation email
 */
async function handleWebinarCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { tenantId, productId, visitorName, visitorEmail } =
    session.metadata || {};

  if (!tenantId || !productId || !visitorEmail) {
    console.error(
      "[DBG][stripe/webhook] Missing webinar metadata:",
      session.id,
    );
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  // Update signup payment status
  await updateWebinarSignupPayment(
    tenantId,
    productId,
    visitorEmail,
    "paid",
    paymentIntentId,
  );

  // Add attendee to all session calendar events
  const sessionEvents = await getCalendarEventsByRecurrenceGroup(
    tenantId,
    productId,
  );

  const newAttendee: EventAttendee = {
    email: visitorEmail.toLowerCase().trim(),
    name: (visitorName || "Guest").trim(),
  };

  for (const event of sessionEvents) {
    const existingAttendees = event.attendees || [];
    await updateCalendarEvent(tenantId, event.date, event.id, {
      attendees: [...existingAttendees, newAttendee],
    });
  }

  // Send confirmation email with cancel link
  const tenant = await getTenantById(tenantId);
  if (tenant) {
    const product = await getProductById(tenantId, productId);
    if (product?.webinarSchedule) {
      const timezone = tenant.bookingConfig?.timezone || "Australia/Sydney";
      const cancelUrl = buildWebinarCancelUrl(tenant, {
        tenantId,
        productId,
        email: visitorEmail,
      });
      const sessions = expandWebinarSessions(product.webinarSchedule, timezone);

      sendWebinarSignupConfirmationEmail({
        visitorName: visitorName || "Guest",
        visitorEmail,
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
          "[DBG][stripe/webhook] Failed to send webinar confirmation:",
          err,
        ),
      );
    }
  }

  console.log(
    `[DBG][stripe/webhook] Webinar signup confirmed: product=${productId} email=${visitorEmail}`,
  );
}

/**
 * Handle checkout.session.expired for webinar signups
 * Deletes the pending signup to free the spot
 */
async function handleWebinarCheckoutExpired(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const { tenantId, productId, visitorEmail } = session.metadata || {};
  if (!tenantId || !productId || !visitorEmail) return;

  // Verify signup exists and is pending payment
  const signup = await getWebinarSignup(tenantId, productId, visitorEmail);
  if (!signup || signup.paymentStatus !== "pending_payment") return;

  await deleteWebinarSignup(tenantId, productId, visitorEmail);
  console.log(
    `[DBG][stripe/webhook] Deleted expired webinar signup: product=${productId} email=${visitorEmail}`,
  );
}
