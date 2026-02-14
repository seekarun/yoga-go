/**
 * POST /api/data/app/ai/voice/function
 * Handles Vapi function call webhooks.
 * Vapi sends function call requests here when the AI invokes tools
 * during a voice conversation.
 *
 * Auth: Validated via x-vapi-secret header (not user session).
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { searchKnowledge } from "@/lib/rag";
import {
  getTenantById,
  updateTenant,
} from "@/lib/repositories/tenantRepository";
import {
  getCalendarEventsByDateRange,
  updateCalendarEvent,
} from "@/lib/repositories/calendarEventRepository";
import { parseVisitorFromDescription } from "@/lib/email/bookingNotification";
import { sendBookingCancelledEmailToVisitor } from "@/lib/email/bookingCancelledEmail";
import { getPaymentIntent, createFullRefund } from "@/lib/stripe";
import type { BusinessInfo } from "@/types/ai-assistant";
import type { CalendarEvent } from "@core/types";

/**
 * Vapi sends server messages with this shape.
 * See: https://docs.vapi.ai/server-url
 * The metadata can be at call level or assistant level depending on Vapi version.
 */
interface VapiServerMessage {
  message: {
    type: string;
    functionCall?: {
      name: string;
      parameters: Record<string, unknown>;
    };
    call?: {
      id: string;
      metadata?: Record<string, string>;
      assistant?: {
        metadata?: Record<string, string>;
      };
    };
  };
}

/**
 * Validate the Vapi server secret from the request header.
 */
function validateSecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-vapi-secret");
  const expected = process.env.VAPI_SERVER_SECRET;
  if (!expected) {
    console.error("[DBG][voice-fn] VAPI_SERVER_SECRET not configured");
    return false;
  }
  return secret === expected;
}

export async function POST(request: NextRequest) {
  try {
    if (!validateSecret(request)) {
      console.warn("[DBG][voice-fn] Invalid or missing secret");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as VapiServerMessage;
    const { message } = body;

    // Only handle function-call messages
    if (message.type !== "function-call") {
      console.log("[DBG][voice-fn] Ignoring message type:", message.type);
      return NextResponse.json({ success: true });
    }

    if (!message.functionCall) {
      console.error(
        "[DBG][voice-fn] function-call message missing functionCall",
      );
      return NextResponse.json({ result: "Invalid request" });
    }

    const { name, parameters } = message.functionCall;
    // Metadata may be at call level or nested under assistant
    const tenantId =
      message.call?.metadata?.tenantId ||
      message.call?.assistant?.metadata?.tenantId;

    console.log("[DBG][voice-fn] Function call:", name, "tenantId:", tenantId);

    if (!tenantId) {
      console.error("[DBG][voice-fn] No tenantId in call metadata");
      return NextResponse.json({
        result: "Error: Unable to identify the business. Please try again.",
      });
    }

    switch (name) {
      case "search_knowledge":
        return handleSearchKnowledge(tenantId, parameters);
      case "get_todays_schedule":
        return handleGetTodaysSchedule(tenantId, parameters);
      case "reschedule_appointment":
        return handleRescheduleAppointment(tenantId, parameters);
      case "cancel_appointment":
        return handleCancelAppointment(tenantId, parameters);
      case "save_business_info":
        return handleSaveBusinessInfo(tenantId, parameters);
      default:
        console.warn("[DBG][voice-fn] Unknown function:", name);
        return NextResponse.json({
          result: `Unknown function: ${name}`,
        });
    }
  } catch (error) {
    console.error("[DBG][voice-fn] Error:", error);
    return NextResponse.json({
      result: "Sorry, I encountered an error processing that request.",
    });
  }
}

/**
 * Handle search_knowledge function call.
 * Searches the tenant's knowledge base and returns relevant chunks.
 */
async function handleSearchKnowledge(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<NextResponse> {
  const query = parameters.query as string;
  if (!query) {
    return NextResponse.json({
      result: "No search query provided.",
    });
  }

  console.log("[DBG][voice-fn] Searching knowledge:", query);

  const chunks = await searchKnowledge(tenantId, query, 3);

  if (chunks.length === 0) {
    return NextResponse.json({
      result:
        "No relevant information found in the knowledge base for this query.",
    });
  }

  const contextText = chunks.map((c, i) => `[${i + 1}] ${c.text}`).join("\n\n");

  return NextResponse.json({
    result: contextText,
  });
}

/**
 * Handle get_todays_schedule function call.
 * Fetches the tenant's calendar events for a given date (defaults to today).
 */
async function handleGetTodaysSchedule(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<NextResponse> {
  const date =
    typeof parameters.date === "string" && parameters.date.trim()
      ? parameters.date.trim()
      : new Date().toISOString().substring(0, 10);

  console.log("[DBG][voice-fn] Getting schedule for:", date);

  const events = await getCalendarEventsByDateRange(tenantId, date, date);

  // Filter to only scheduled/pending events (not cancelled/completed)
  const activeEvents = events.filter(
    (e: CalendarEvent) =>
      e.status === "scheduled" ||
      e.status === "pending" ||
      e.status === "pending_payment",
  );

  if (activeEvents.length === 0) {
    return NextResponse.json({
      result: `No appointments scheduled for ${date}.`,
    });
  }

  // Sort by start time
  activeEvents.sort(
    (a: CalendarEvent, b: CalendarEvent) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  // Format events for voice readback
  const summary = activeEvents
    .map((e: CalendarEvent) => {
      const start = new Date(e.startTime);
      const time = start.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      const duration = e.duration ? `${e.duration} min` : "";
      const attendees =
        e.attendees && e.attendees.length > 0
          ? ` with ${e.attendees.map((a) => a.name || a.email).join(", ")}`
          : "";
      const statusNote = e.status === "pending" ? " (pending approval)" : "";
      return `- ${time}: ${e.title}${attendees} (${duration})${statusNote}`;
    })
    .join("\n");

  return NextResponse.json({
    result: `Schedule for ${date} (${activeEvents.length} appointment${activeEvents.length === 1 ? "" : "s"}):\n${summary}`,
  });
}

/**
 * Handle save_business_info function call.
 * Updates the tenant's business info in the AI assistant config.
 */
async function handleSaveBusinessInfo(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<NextResponse> {
  console.log("[DBG][voice-fn] Saving business info for tenant:", tenantId);

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return NextResponse.json({
      result: "Error: Tenant not found.",
    });
  }

  // Build clean business info from parameters
  const newInfo: BusinessInfo = {};
  if (
    typeof parameters.businessName === "string" &&
    parameters.businessName.trim()
  ) {
    newInfo.businessName = parameters.businessName.trim();
  }
  if (
    typeof parameters.description === "string" &&
    parameters.description.trim()
  ) {
    newInfo.description = parameters.description.trim();
  }
  if (
    typeof parameters.openingHours === "string" &&
    parameters.openingHours.trim()
  ) {
    newInfo.openingHours = parameters.openingHours.trim();
  }
  if (typeof parameters.services === "string" && parameters.services.trim()) {
    newInfo.services = parameters.services.trim();
  }
  if (typeof parameters.location === "string" && parameters.location.trim()) {
    newInfo.location = parameters.location.trim();
  }
  if (
    typeof parameters.contactInfo === "string" &&
    parameters.contactInfo.trim()
  ) {
    newInfo.contactInfo = parameters.contactInfo.trim();
  }
  if (
    typeof parameters.additionalNotes === "string" &&
    parameters.additionalNotes.trim()
  ) {
    newInfo.additionalNotes = parameters.additionalNotes.trim();
  }

  // Merge with existing config
  const currentConfig = tenant.aiAssistantConfig || {
    enabled: false,
    widgetPosition: "bottom-right" as const,
    welcomeMessage: "Hi! How can I help you today?",
    placeholderText: "Type your message...",
  };

  const mergedBusinessInfo: BusinessInfo = {
    ...currentConfig.businessInfo,
    ...newInfo,
  };

  await updateTenant(tenantId, {
    aiAssistantConfig: {
      ...currentConfig,
      businessInfo: mergedBusinessInfo,
    },
  });

  console.log("[DBG][voice-fn] Business info saved for tenant:", tenantId);

  const savedFields = Object.keys(newInfo).join(", ");
  return NextResponse.json({
    result: `Business information saved successfully. Updated fields: ${savedFields}`,
  });
}

/**
 * Handle reschedule_appointment function call.
 * Moves an appointment to a new time. If the date changes, the repository
 * handles delete+recreate (DynamoDB SK includes date).
 */
async function handleRescheduleAppointment(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<NextResponse> {
  const eventId = parameters.eventId as string;
  const date = parameters.date as string;
  const newStartTime = parameters.newStartTime as string;
  const newEndTime = parameters.newEndTime as string | undefined;

  if (!eventId || !date || !newStartTime) {
    return NextResponse.json({
      result:
        "Missing required parameters. I need the eventId, date, and new start time to reschedule.",
    });
  }

  console.log(
    "[DBG][voice-fn] Rescheduling event:",
    eventId,
    "to",
    newStartTime,
  );

  // Fetch the current event to get its duration
  const events = await getCalendarEventsByDateRange(tenantId, date, date);
  const event = events.find((e: CalendarEvent) => e.id === eventId);

  if (!event) {
    return NextResponse.json({
      result:
        "Could not find that appointment. It may have been moved or deleted.",
    });
  }

  // Calculate new end time if not provided (preserve original duration)
  let calculatedEndTime = newEndTime;
  if (!calculatedEndTime && event.duration) {
    const newStart = new Date(newStartTime);
    const endMs = newStart.getTime() + event.duration * 60 * 1000;
    calculatedEndTime = new Date(endMs).toISOString();
  }

  const updates: Record<string, unknown> = { startTime: newStartTime };
  if (calculatedEndTime) {
    updates.endTime = calculatedEndTime;
  }

  const updated = await updateCalendarEvent(tenantId, date, eventId, updates);

  if (!updated) {
    return NextResponse.json({
      result: "Failed to reschedule the appointment. Please try again.",
    });
  }

  const newTime = new Date(newStartTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const attendees =
    updated.attendees && updated.attendees.length > 0
      ? ` with ${updated.attendees.map((a) => a.name || a.email).join(", ")}`
      : "";

  return NextResponse.json({
    result: `Done! "${updated.title}"${attendees} has been moved to ${newTime}.`,
  });
}

/**
 * Handle cancel_appointment function call.
 * Cancels an appointment, processes Stripe refund if applicable,
 * and sends cancellation email to the visitor.
 */
async function handleCancelAppointment(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<NextResponse> {
  const eventId = parameters.eventId as string;
  const date = parameters.date as string;

  if (!eventId || !date) {
    return NextResponse.json({
      result:
        "Missing required parameters. I need the eventId and date to cancel.",
    });
  }

  console.log("[DBG][voice-fn] Cancelling event:", eventId);

  // Fetch the event to get details for refund/notification
  const events = await getCalendarEventsByDateRange(tenantId, date, date);
  const event = events.find((e: CalendarEvent) => e.id === eventId);

  if (!event) {
    return NextResponse.json({
      result:
        "Could not find that appointment. It may have already been cancelled.",
    });
  }

  if (event.status === "cancelled") {
    return NextResponse.json({
      result: "That appointment is already cancelled.",
    });
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    return NextResponse.json({ result: "Error: Tenant not found." });
  }

  // Process Stripe refund if the event was a paid booking
  let refundAmountCents = 0;
  let stripeRefundId: string | undefined;

  if (event.stripePaymentIntentId) {
    try {
      const paymentIntent = await getPaymentIntent(event.stripePaymentIntentId);
      refundAmountCents = paymentIntent.amount;
      const refund = await createFullRefund(event.stripePaymentIntentId);
      stripeRefundId = refund.id;
      console.log(
        "[DBG][voice-fn] Refund created:",
        stripeRefundId,
        "amount:",
        refundAmountCents,
      );
    } catch (err) {
      console.error("[DBG][voice-fn] Refund failed:", err);
      // Continue with cancellation even if refund fails
    }
  }

  // Update event status to cancelled with metadata
  const cancelUpdates: Record<string, unknown> = {
    status: "cancelled",
    cancelledBy: "tenant",
    cancelledAt: new Date().toISOString(),
  };
  if (refundAmountCents > 0) {
    cancelUpdates.refundAmountCents = refundAmountCents;
  }
  if (stripeRefundId) {
    cancelUpdates.stripeRefundId = stripeRefundId;
  }

  await updateCalendarEvent(tenantId, date, eventId, cancelUpdates);

  // Send cancellation email to visitor if we can parse their info
  const visitor = parseVisitorFromDescription(event.description);
  if (visitor) {
    try {
      await sendBookingCancelledEmailToVisitor({
        visitorName: visitor.visitorName,
        visitorEmail: visitor.visitorEmail,
        startTime: event.startTime,
        endTime: event.endTime,
        tenant,
        cancelledBy: "tenant",
        refundAmountCents,
        currency: "usd",
        isFullRefund: refundAmountCents > 0,
      });
      console.log(
        "[DBG][voice-fn] Cancellation email sent to:",
        visitor.visitorEmail,
      );
    } catch (err) {
      console.error("[DBG][voice-fn] Failed to send cancellation email:", err);
    }
  }

  const attendees =
    event.attendees && event.attendees.length > 0
      ? ` with ${event.attendees.map((a) => a.name || a.email).join(", ")}`
      : "";
  const refundNote =
    refundAmountCents > 0
      ? ` A full refund of $${(refundAmountCents / 100).toFixed(2)} has been processed.`
      : "";
  const emailNote = visitor ? " The visitor has been notified." : "";

  return NextResponse.json({
    result: `Cancelled "${event.title}"${attendees}.${refundNote}${emailNote}`,
  });
}
