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
  generateMessageId,
  buildSystemPrompt,
} from "@/lib/openai";
import type { ChatMessage, ChatCompletionRequest } from "@/types/ai-assistant";

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

    // Build system prompt from tenant config (includes business info)
    const systemPrompt = buildSystemPrompt(
      tenant.aiAssistantConfig.systemPrompt,
      tenant.aiAssistantConfig.businessInfo,
    );

    // Call OpenAI
    const result = await createChatCompletion(messages, systemPrompt);

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
