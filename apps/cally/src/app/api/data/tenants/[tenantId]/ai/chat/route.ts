/**
 * POST /api/data/tenants/{tenantId}/ai/chat
 * Public chat endpoint (no auth required)
 * Used for visitor chat on landing pages
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTenantById } from "@/lib/repositories/tenantRepository";
import {
  createChatCompletion,
  createChatCompletionWithTools,
  generateMessageId,
  buildSystemPrompt,
} from "@/lib/openai";
import type { ChatMessage, ChatCompletionRequest } from "@/types/ai-assistant";
import { searchKnowledge } from "@/lib/rag";
import {
  BOOKING_TOOL_DEFINITIONS,
  executeToolCall,
  buildBookingSystemPromptAddition,
} from "@/lib/ai/booking-tools";

interface RouteParams {
  params: Promise<{
    tenantId: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { tenantId } = await params;
    console.log("[DBG][public-ai-chat] Chat request for tenant:", tenantId);

    // Get tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Check if AI assistant is enabled
    if (!tenant.aiAssistantConfig?.enabled) {
      return NextResponse.json(
        { success: false, error: "AI assistant is not enabled" },
        { status: 403 },
      );
    }

    // Parse request body
    const body = (await request.json()) as ChatCompletionRequest;

    if (!body.message || typeof body.message !== "string") {
      return NextResponse.json(
        { success: false, error: "Message is required" },
        { status: 400 },
      );
    }

    // Build messages array
    const messages: ChatMessage[] = body.sessionMessages || [];
    const userMessage: ChatMessage = {
      id: generateMessageId(),
      role: "user",
      content: body.message,
      timestamp: new Date().toISOString(),
    };
    messages.push(userMessage);

    // Retrieve relevant knowledge base context
    const relevantChunks = await searchKnowledge(tenantId, body.message, 3);

    // Build system prompt from tenant config (includes business info + RAG context)
    const baseSystemPrompt = buildSystemPrompt(
      tenant.aiAssistantConfig.systemPrompt,
      tenant.aiAssistantConfig.businessInfo,
      relevantChunks,
    );

    // Append booking tool instructions if tenant has booking enabled
    const bookingAddition = await buildBookingSystemPromptAddition(tenant);

    // Resolve visitor timezone: client-side (browser) → Vercel header → null
    const visitorTimezone =
      body.visitorInfo?.timezone ||
      request.headers.get("x-vercel-ip-timezone") ||
      undefined;

    // Build visitor context section (logged-in user info + timezone)
    const visitorParts: string[] = [];
    if (body.visitorInfo?.name || body.visitorInfo?.email) {
      visitorParts.push("VISITOR INFO (logged-in user):");
      if (body.visitorInfo.name) {
        visitorParts.push(`- Name: ${body.visitorInfo.name}`);
      }
      if (body.visitorInfo.email) {
        visitorParts.push(`- Email: ${body.visitorInfo.email}`);
      }
      visitorParts.push(
        "Since you already know this visitor's name and email, do NOT ask for them again when creating a booking. Use these details directly.",
      );
    }

    const businessTimezone =
      tenant.bookingConfig?.timezone || "Australia/Sydney";
    if (visitorTimezone && visitorTimezone !== businessTimezone) {
      visitorParts.push(
        `\nVISITOR TIMEZONE: ${visitorTimezone}`,
        `The visitor's timezone (${visitorTimezone}) is different from the business timezone (${businessTimezone}).`,
        `The check_availability tool returns times pre-formatted in both timezones (displayBusiness and displayVisitor). Use those values exactly — do NOT calculate timezone conversions yourself.`,
        `When showing available times, show both the business and visitor timezone versions from the tool response.`,
        `IMPORTANT: When the visitor requests a time (e.g. "10am tomorrow"), confirm which timezone they mean before proceeding. For example: "Just to confirm — did you mean 10:00 AM in your local time (${visitorTimezone}) or 10:00 AM ${businessTimezone}?"`,
        `CRITICAL: After the visitor confirms their timezone, match their requested time against the CORRECT timezone column from the tool results. If the visitor says "${visitorTimezone} time", look at the displayVisitor values to find a matching slot. If they say "${businessTimezone} time", look at displayBusiness. For example, if they ask for "10am ${visitorTimezone}", find the slot where displayVisitor shows "10:00 AM", NOT the slot where displayBusiness shows "10:00 AM". If no slot matches the requested time in the confirmed timezone, tell the visitor and suggest the closest available options.`,
      );
    } else if (visitorTimezone) {
      visitorParts.push(
        `\nVISITOR TIMEZONE: ${visitorTimezone} (same as business timezone)`,
      );
    }

    const visitorSection =
      visitorParts.length > 0 ? visitorParts.join("\n") : null;

    const systemPrompt = [baseSystemPrompt, bookingAddition, visitorSection]
      .filter(Boolean)
      .join("\n\n");

    // Call OpenAI — use tool calling if booking is configured
    const hasBooking = !!tenant.bookingConfig;
    const result = hasBooking
      ? await createChatCompletionWithTools(
          messages,
          systemPrompt,
          BOOKING_TOOL_DEFINITIONS,
          (toolName, toolArgs) =>
            executeToolCall(
              tenantId,
              toolName,
              toolArgs,
              tenant,
              visitorTimezone,
            ),
        )
      : await createChatCompletion(messages, systemPrompt);

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: result.content,
      timestamp: new Date().toISOString(),
    };

    console.log(
      "[DBG][public-ai-chat] Response generated for tenant:",
      tenantId,
    );

    return NextResponse.json({
      success: true,
      data: {
        message: assistantMessage,
      },
    });
  } catch (error) {
    console.error("[DBG][public-ai-chat] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Failed to generate response: ${errorMessage}` },
      { status: 500 },
    );
  }
}
