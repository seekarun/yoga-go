/**
 * POST /api/data/app/ai/chat
 * Authenticated chat endpoint — Agent Assistant (tenant-facing)
 * Supports tool calling for daily brief, appointments, emails, etc.
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import {
  createChatCompletionWithTools,
  generateMessageId,
  buildSystemPrompt,
} from "@/lib/openai";
import type { ChatMessage, ChatCompletionRequest } from "@/types/ai-assistant";
import { searchKnowledge } from "@/lib/rag";
import {
  ASSISTANT_TOOL_DEFINITIONS,
  executeAssistantToolCall,
  buildAssistantSystemPrompt,
} from "@/lib/ai/assistant-tools";

export async function POST(request: NextRequest) {
  try {
    // Check authentication — try Bearer token first (mobile), fall back to cookie (web)
    let cognitoSub: string | undefined;

    const mobileAuth = await getMobileAuthResult(request);
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (!mobileAuth.tokenExpired) {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json(
        {
          success: false,
          error: mobileAuth.tokenExpired
            ? "Token expired"
            : "Not authenticated",
        },
        { status: 401 },
      );
    }
    console.log("[DBG][ai-chat] Assistant chat for user:", cognitoSub);

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
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

    // Build the assistant system prompt
    const assistantPrompt = buildAssistantSystemPrompt(tenant);

    // Retrieve relevant knowledge base context and append to prompt
    const relevantChunks = await searchKnowledge(tenant.id, body.message, 3);
    let systemPrompt = assistantPrompt;
    if (relevantChunks && relevantChunks.length > 0) {
      const ragContext = relevantChunks
        .map((chunk) => `---\n${chunk.text}\n---`)
        .join("\n");
      systemPrompt += `\n\nRelevant Knowledge Base Information:\n${ragContext}\nUse the above knowledge base information to answer when relevant.`;
    }

    // Also include custom business info from tenant config
    if (tenant.aiAssistantConfig?.businessInfo) {
      const bizPrompt = buildSystemPrompt(
        undefined,
        tenant.aiAssistantConfig.businessInfo,
      );
      systemPrompt += `\n\n${bizPrompt}`;
    }

    // Call OpenAI with tool calling (5 iterations to support multi-step flows
    // like: get_appointments → update_appointment → final response)
    const result = await createChatCompletionWithTools(
      messages,
      systemPrompt,
      ASSISTANT_TOOL_DEFINITIONS,
      (toolName, toolArgs) =>
        executeAssistantToolCall(tenant.id, toolName, toolArgs, tenant),
      5,
    );

    // Create assistant message
    const assistantMessage: ChatMessage = {
      id: generateMessageId(),
      role: "assistant",
      content: result.content,
      timestamp: new Date().toISOString(),
    };

    console.log(
      "[DBG][ai-chat] Assistant response generated for tenant:",
      tenant.id,
    );

    return NextResponse.json({
      success: true,
      data: {
        message: assistantMessage,
      },
    });
  } catch (error) {
    console.error("[DBG][ai-chat] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: `Failed to generate response: ${errorMessage}`,
      },
      { status: 500 },
    );
  }
}
