/**
 * POST /api/data/app/ai/voice/start
 * Returns a Vapi inline assistant config for the authenticated tenant.
 * The client passes this config to vapi.start({ assistant: config }).
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getCalendarEventsByDateRange } from "@/lib/repositories/calendarEventRepository";
import { buildSystemPrompt } from "@/lib/openai";
import { buildVapiAssistantConfig } from "@/lib/vapi";
import { DEFAULT_AI_ASSISTANT_CONFIG } from "@/types/ai-assistant";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log("[DBG][voice-start] Starting voice session for:", cognitoSub);

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const aiConfig = tenant.aiAssistantConfig || DEFAULT_AI_ASSISTANT_CONFIG;

    const tenantTz = tenant.timezone || "UTC";
    console.log(
      "[DBG][voice-start] Tenant timezone raw:",
      JSON.stringify(tenant.timezone),
      "→ using:",
      tenantTz,
    );
    const today = new Date()
      .toLocaleDateString("en-CA", { timeZone: tenantTz })
      .substring(0, 10);

    // Construct the function call handler URL.
    // Vapi needs a publicly reachable URL for webhooks.
    // On Vercel, NEXTAUTH_URL or VERCEL_URL is public.
    // For local dev, set VAPI_WEBHOOK_URL to your deployed Vercel URL.
    const webhookBase =
      process.env.VAPI_WEBHOOK_URL ||
      process.env.NEXTAUTH_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
      "http://localhost:3000";
    const serverUrl = `${webhookBase}/api/data/app/ai/voice/function`;

    if (webhookBase.includes("localhost")) {
      console.warn(
        "[DBG][voice-start] Server URL is localhost — Vapi cannot reach it. " +
          "Set VAPI_WEBHOOK_URL to your deployed URL for function calling to work.",
      );
    }

    const serverSecret = process.env.VAPI_SERVER_SECRET;
    if (!serverSecret) {
      console.error("[DBG][voice-start] VAPI_SERVER_SECRET not set");
      return NextResponse.json(
        { success: false, error: "Voice service not configured" },
        { status: 500 },
      );
    }

    const vapiPublicKey = process.env.VAPI_PUBLIC_KEY;
    if (!vapiPublicKey) {
      console.error("[DBG][voice-start] VAPI_PUBLIC_KEY not set");
      return NextResponse.json(
        { success: false, error: "Voice service not configured" },
        { status: 500 },
      );
    }

    // Pre-fetch today's schedule — inject into system prompt so the AI
    // has real data even if the webhook URL isn't reachable (e.g. localhost)
    let todayEventCount = 0;
    let scheduleContext = "";
    try {
      const todayEvents = await getCalendarEventsByDateRange(
        tenant.id,
        today,
        today,
      );
      const activeEvents = todayEvents
        .filter(
          (e) =>
            e.status === "scheduled" ||
            e.status === "pending" ||
            e.status === "pending_payment",
        )
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        );

      todayEventCount = activeEvents.length;

      if (activeEvents.length > 0) {
        const lines = activeEvents.map((e) => {
          const start = new Date(e.startTime);
          const time = start.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
            timeZone: tenantTz,
          });
          const eventDate = e.startTime.substring(0, 10);
          const duration = e.duration ? `, ${e.duration} min` : "";
          const attendees =
            e.attendees && e.attendees.length > 0
              ? ` with ${e.attendees.map((a) => a.name || a.email).join(", ")}`
              : "";
          const statusNote =
            e.status === "pending" ? " (pending approval)" : "";
          return `${time}: ${e.title}${attendees}${duration}${statusNote} [eventId=${e.id}, date=${eventDate}]`;
        });
        scheduleContext = `\n\nToday's schedule (${today}):\n${lines.join("\n")}\n\nNote: Use the eventId and date values above when calling reschedule_appointment or cancel_appointment tools.`;
      } else {
        scheduleContext = `\n\nToday's schedule (${today}): No appointments.`;
      }
    } catch (err) {
      console.warn("[DBG][voice-start] Could not pre-fetch schedule:", err);
    }

    // Build system prompt with business info + schedule context
    const basePrompt = buildSystemPrompt(
      aiConfig.systemPrompt,
      aiConfig.businessInfo,
    );

    const systemPrompt = `${basePrompt}

You are the business owner's personal assistant. Talk like a real person — warm, casual, and natural. Never list your capabilities or say things like "I can help you with..." or "What would you like to do?".

Instead, be proactive. If they ask about their day, pull up the schedule and summarize it naturally. If they mention something about their business, just help. Be like a friendly colleague who already knows the context.

Keep responses short and conversational — this is a voice call, not a text chat. Avoid bullet points or structured lists. Speak in flowing sentences.

IMPORTANT: Never make up or guess appointment details, names, times, or business data. Only state facts from your context or retrieved from tools. If a tool call fails or returns no data, just say you couldn't pull it up right now.

Today's date is ${today}. All times are in the ${tenantTz} timezone. Always refer to times in this timezone.${scheduleContext}`;

    // Build a natural, human greeting based on time of day and schedule
    const hour = parseInt(
      new Date().toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: tenantTz,
      }),
      10,
    );
    const timeGreeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

    let firstMessage: string;
    if (todayEventCount === 0) {
      firstMessage = `Hey! ${timeGreeting}. Looks like a quiet day today — no appointments on the calendar.`;
    } else if (todayEventCount === 1) {
      firstMessage = `Hey! ${timeGreeting}. You've got one appointment on the books today.`;
    } else if (todayEventCount <= 3) {
      firstMessage = `Hey! ${timeGreeting}. You've got ${todayEventCount} appointments today — not too bad.`;
    } else {
      firstMessage = `Hey! ${timeGreeting}. Busy day ahead — you've got ${todayEventCount} appointments lined up.`;
    }

    const assistantConfig = buildVapiAssistantConfig(
      systemPrompt,
      serverUrl,
      serverSecret,
      firstMessage,
      tenant.id,
    );

    console.log(
      "[DBG][voice-start] Assistant config built for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        assistantConfig,
        vapiPublicKey,
        tenantId: tenant.id,
      },
    });
  } catch (error) {
    console.error("[DBG][voice-start] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Voice start failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
