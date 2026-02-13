/**
 * POST /api/data/app/ai/chat
 * Demo chat endpoint (authenticated)
 * Used for testing AI in the dashboard
 */
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  createChatCompletion,
  generateMessageId,
  buildSystemPrompt,
} from "@/lib/openai";
import type { ChatMessage, ChatCompletionRequest } from "@/types/ai-assistant";
import { searchKnowledge } from "@/lib/rag";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    console.log("[DBG][ai-chat] Demo chat for user:", cognitoSub);

    // Get tenant to access custom system prompt
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

    // Retrieve relevant knowledge base context
    const relevantChunks = await searchKnowledge(tenant.id, body.message, 3);

    // Build system prompt from tenant config (includes business info + RAG context)
    const systemPrompt = buildSystemPrompt(
      tenant.aiAssistantConfig?.systemPrompt,
      tenant.aiAssistantConfig?.businessInfo,
      relevantChunks,
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
      "[DBG][ai-chat] Demo response generated for tenant:",
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
      { success: false, error: `Failed to generate response: ${errorMessage}` },
      { status: 500 },
    );
  }
}
