/**
 * POST /api/data/app/ai/voice/function
 * Handles Vapi tool call webhooks.
 * Vapi sends tool-calls requests here when the AI invokes tools
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
 * Vapi "tool-calls" server message shape.
 * See: https://docs.vapi.ai/server-url
 */
interface VapiToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

interface VapiServerMessage {
  message: {
    type: string;
    // "tool-calls" format (current Vapi)
    toolCallList?: VapiToolCall[];
    // Legacy "function-call" format
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
  const secret = request.headers.get("x-vapi-secret")?.trim();
  const expected = process.env.VAPI_SERVER_SECRET?.trim();
  if (!expected) {
    console.error("[DBG][voice-fn] VAPI_SERVER_SECRET not configured");
    return false;
  }
  const valid = secret === expected;
  if (!valid) {
    console.error(
      "[DBG][voice-fn] Secret mismatch. Got length:",
      secret?.length ?? 0,
      "Expected length:",
      expected.length,
    );
  }
  return valid;
}

/**
 * Execute a tool call and return the result string.
 */
async function executeTool(
  name: string,
  parameters: Record<string, unknown>,
  tenantId: string,
): Promise<string> {
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
      return `Unknown function: ${name}`;
  }
}

export async function POST(request: NextRequest) {
  console.log(
    "[DBG][voice-fn] Webhook hit from:",
    request.headers.get("user-agent")?.substring(0, 50),
  );

  try {
    if (!validateSecret(request)) {
      console.warn("[DBG][voice-fn] Invalid or missing secret — returning 401");
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as VapiServerMessage;
    const { message } = body;

    console.log("[DBG][voice-fn] Received message type:", message.type);

    // Extract tenantId from call metadata
    const tenantId =
      message.call?.metadata?.tenantId ||
      message.call?.assistant?.metadata?.tenantId;

    // Handle "tool-calls" (current Vapi format)
    if (message.type === "tool-calls" && message.toolCallList) {
      if (!tenantId) {
        console.error("[DBG][voice-fn] No tenantId in call metadata");
        return NextResponse.json({
          results: message.toolCallList.map((tc) => ({
            toolCallId: tc.id,
            name: tc.function.name,
            error: "Error: Unable to identify the business. Please try again.",
          })),
        });
      }

      const results = await Promise.all(
        message.toolCallList.map(async (toolCall) => {
          const fnName = toolCall.function.name;
          let parameters: Record<string, unknown> = {};
          try {
            parameters = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            console.error(
              "[DBG][voice-fn] Failed to parse arguments for:",
              fnName,
            );
          }

          console.log(
            "[DBG][voice-fn] Tool call:",
            fnName,
            "tenantId:",
            tenantId,
          );

          try {
            const result = await executeTool(fnName, parameters, tenantId);
            return { toolCallId: toolCall.id, name: fnName, result };
          } catch (err) {
            console.error("[DBG][voice-fn] Tool execution error:", err);
            return {
              toolCallId: toolCall.id,
              name: fnName,
              error: "Sorry, I encountered an error processing that request.",
            };
          }
        }),
      );

      return NextResponse.json({ results });
    }

    // Handle legacy "function-call" format
    if (message.type === "function-call" && message.functionCall) {
      const { name, parameters } = message.functionCall;

      console.log(
        "[DBG][voice-fn] Legacy function call:",
        name,
        "tenantId:",
        tenantId,
      );

      if (!tenantId) {
        console.error("[DBG][voice-fn] No tenantId in call metadata");
        return NextResponse.json({
          result: "Error: Unable to identify the business. Please try again.",
        });
      }

      const result = await executeTool(name, parameters, tenantId);
      return NextResponse.json({ result });
    }

    // Ignore other message types (status updates, transcripts, etc.)
    console.log("[DBG][voice-fn] Ignoring message type:", message.type);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DBG][voice-fn] Error:", error);
    return NextResponse.json({
      results: [
        {
          error: "Sorry, I encountered an error processing that request.",
        },
      ],
    });
  }
}

// ─── Tool Handlers ───────────────────────────────────────────────

async function handleSearchKnowledge(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<string> {
  const query = parameters.query as string;
  if (!query) return "No search query provided.";

  console.log("[DBG][voice-fn] Searching knowledge:", query);
  const chunks = await searchKnowledge(tenantId, query, 3);

  if (chunks.length === 0) {
    return "No relevant information found in the knowledge base for this query.";
  }

  return chunks.map((c, i) => `[${i + 1}] ${c.text}`).join("\n\n");
}

async function handleGetTodaysSchedule(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<string> {
  const date =
    typeof parameters.date === "string" && parameters.date.trim()
      ? parameters.date.trim()
      : new Date().toISOString().substring(0, 10);

  console.log("[DBG][voice-fn] Getting schedule for:", date);
  const events = await getCalendarEventsByDateRange(tenantId, date, date);

  const activeEvents = events.filter(
    (e: CalendarEvent) =>
      e.status === "scheduled" ||
      e.status === "pending" ||
      e.status === "pending_payment",
  );

  if (activeEvents.length === 0) {
    return `No appointments scheduled for ${date}.`;
  }

  activeEvents.sort(
    (a: CalendarEvent, b: CalendarEvent) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

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

  return `Schedule for ${date} (${activeEvents.length} appointment${activeEvents.length === 1 ? "" : "s"}):\n${summary}`;
}

async function handleSaveBusinessInfo(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<string> {
  console.log("[DBG][voice-fn] Saving business info for tenant:", tenantId);

  const tenant = await getTenantById(tenantId);
  if (!tenant) return "Error: Tenant not found.";

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
  return `Business information saved successfully. Updated fields: ${savedFields}`;
}

async function handleRescheduleAppointment(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<string> {
  const eventId = parameters.eventId as string;
  const date = parameters.date as string;
  const newStartTime = parameters.newStartTime as string;
  const newEndTime = parameters.newEndTime as string | undefined;

  if (!eventId || !date || !newStartTime) {
    return "Missing required parameters. I need the eventId, date, and new start time to reschedule.";
  }

  console.log(
    "[DBG][voice-fn] Rescheduling event:",
    eventId,
    "to",
    newStartTime,
  );

  const events = await getCalendarEventsByDateRange(tenantId, date, date);
  const event = events.find((e: CalendarEvent) => e.id === eventId);

  if (!event) {
    return "Could not find that appointment. It may have been moved or deleted.";
  }

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
    return "Failed to reschedule the appointment. Please try again.";
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

  return `Done! "${updated.title}"${attendees} has been moved to ${newTime}.`;
}

async function handleCancelAppointment(
  tenantId: string,
  parameters: Record<string, unknown>,
): Promise<string> {
  const eventId = parameters.eventId as string;
  const date = parameters.date as string;

  if (!eventId || !date) {
    return "Missing required parameters. I need the eventId and date to cancel.";
  }

  console.log("[DBG][voice-fn] Cancelling event:", eventId);

  const events = await getCalendarEventsByDateRange(tenantId, date, date);
  const event = events.find((e: CalendarEvent) => e.id === eventId);

  if (!event) {
    return "Could not find that appointment. It may have already been cancelled.";
  }

  if (event.status === "cancelled") {
    return "That appointment is already cancelled.";
  }

  const tenant = await getTenantById(tenantId);
  if (!tenant) return "Error: Tenant not found.";

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
    }
  }

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

  // Send cancellation email to visitor
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

  return `Cancelled "${event.title}"${attendees}.${refundNote}${emailNote}`;
}
