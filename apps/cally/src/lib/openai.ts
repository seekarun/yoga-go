/**
 * OpenAI Integration for CallyGo AI Assistant
 */

import type { ChatMessage, BusinessInfo } from "@/types/ai-assistant";
import type { RetrievedChunk } from "@/types";
import { DEFAULT_SYSTEM_PROMPT } from "@/types/ai-assistant";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Build a system prompt that includes business information
 */
export function buildSystemPrompt(
  customPrompt?: string,
  businessInfo?: BusinessInfo,
  retrievedContext?: RetrievedChunk[],
): string {
  const parts: string[] = [];

  // Start with business name if available
  if (businessInfo?.businessName) {
    parts.push(`You are a helpful assistant for ${businessInfo.businessName}.`);
  } else {
    parts.push(
      "You are a helpful assistant for a professional service provider.",
    );
  }

  // Add business details section if any info is provided
  const hasBusinessInfo =
    businessInfo?.description ||
    businessInfo?.openingHours ||
    businessInfo?.services ||
    businessInfo?.contactInfo ||
    businessInfo?.location ||
    businessInfo?.additionalNotes;

  if (hasBusinessInfo) {
    parts.push("\n\nBusiness Details:");

    if (businessInfo?.description) {
      parts.push(`- About: ${businessInfo.description}`);
    }
    if (businessInfo?.openingHours) {
      parts.push(`- Opening Hours: ${businessInfo.openingHours}`);
    }
    if (businessInfo?.services) {
      parts.push(`- Services: ${businessInfo.services}`);
    }
    if (businessInfo?.location) {
      parts.push(`- Location: ${businessInfo.location}`);
    }
    if (businessInfo?.contactInfo) {
      parts.push(`- Contact: ${businessInfo.contactInfo}`);
    }
    if (businessInfo?.additionalNotes) {
      parts.push(`- Additional Info: ${businessInfo.additionalNotes}`);
    }
  }

  // Add retrieved knowledge base context if available
  if (retrievedContext && retrievedContext.length > 0) {
    parts.push("\n\nRelevant Knowledge Base Information:");
    for (const chunk of retrievedContext) {
      parts.push(`---\n${chunk.text}\n---`);
    }
    parts.push(
      "Use the above knowledge base information to answer when relevant.",
    );
  }

  // Add custom instructions or default behavior
  if (customPrompt) {
    parts.push(`\n\nAdditional Instructions:\n${customPrompt}`);
  } else {
    parts.push(
      "\n\nBe friendly, concise, and helpful. Answer questions about the business, services, availability, and general inquiries. Keep responses brief and to the point.",
    );
  }

  return parts.join("\n");
}

// ============================================================
// Exported Types for Tool Calling
// ============================================================

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export type ToolExecutor = (
  toolName: string,
  toolArgs: string,
) => Promise<string>;

// ============================================================
// Internal OpenAI API Types
// ============================================================

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Get OpenAI API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Get model name from environment or use default
 */
function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

/**
 * Convert ChatMessage array to OpenAI message format
 */
function toOpenAIMessages(
  messages: ChatMessage[],
  systemPrompt: string,
): OpenAIMessage[] {
  const openAIMessages: OpenAIMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  for (const msg of messages) {
    if (msg.role === "user" || msg.role === "assistant") {
      openAIMessages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  return openAIMessages;
}

/**
 * Create a chat completion using OpenAI API
 */
export async function createChatCompletion(
  messages: ChatMessage[],
  systemPrompt?: string,
): Promise<{ content: string }> {
  console.log("[DBG][openai] Creating chat completion");

  const apiKey = getApiKey();
  const model = getModel();
  const prompt = systemPrompt || DEFAULT_SYSTEM_PROMPT;

  const openAIMessages = toOpenAIMessages(messages, prompt);

  console.log("[DBG][openai] Using model:", model);
  console.log("[DBG][openai] Message count:", openAIMessages.length);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: openAIMessages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DBG][openai] API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    console.error("[DBG][openai] No choices in response");
    throw new Error("No response from OpenAI");
  }

  const content = data.choices[0].message.content || "";
  console.log(
    "[DBG][openai] Response received, tokens:",
    data.usage?.total_tokens,
  );

  return { content };
}

/**
 * Create a chat completion with tool calling support.
 * Loops up to maxIterations times if the model requests tool calls.
 */
export async function createChatCompletionWithTools(
  messages: ChatMessage[],
  systemPrompt: string,
  tools: ToolDefinition[],
  toolExecutor: ToolExecutor,
  maxIterations = 3,
): Promise<{ content: string }> {
  console.log("[DBG][openai] Creating chat completion with tools");

  const apiKey = getApiKey();
  const model = getModel();

  // Build the initial message list
  const openAIMessages: OpenAIMessage[] = toOpenAIMessages(
    messages,
    systemPrompt,
  );

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(
      `[DBG][openai] Tool iteration ${iteration + 1}/${maxIterations}, messages: ${openAIMessages.length}`,
    );

    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: openAIMessages,
        tools,
        tool_choice: "auto",
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        "[DBG][openai] API error (tools):",
        response.status,
        errorText,
      );
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = (await response.json()) as OpenAIResponse;

    if (!data.choices || data.choices.length === 0) {
      console.error("[DBG][openai] No choices in tool response");
      throw new Error("No response from OpenAI");
    }

    const choice = data.choices[0];
    const assistantMsg = choice.message;

    console.log(
      "[DBG][openai] Tool response, finish_reason:",
      choice.finish_reason,
      "tool_calls:",
      assistantMsg.tool_calls?.length ?? 0,
    );

    // If no tool calls, return the text content
    if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
      return { content: assistantMsg.content || "" };
    }

    // Append the assistant message with tool_calls to the conversation
    openAIMessages.push({
      role: "assistant",
      content: assistantMsg.content,
      tool_calls: assistantMsg.tool_calls,
    });

    // Execute each tool call and append results
    for (const toolCall of assistantMsg.tool_calls) {
      console.log(`[DBG][openai] Executing tool: ${toolCall.function.name}`);

      const result = await toolExecutor(
        toolCall.function.name,
        toolCall.function.arguments,
      );

      openAIMessages.push({
        role: "tool",
        content: result,
        tool_call_id: toolCall.id,
      });
    }
  }

  // Max iterations reached — return the last content we have
  console.warn("[DBG][openai] Max tool iterations reached");
  return {
    content:
      "I apologize, but I'm having trouble completing that action right now. Could you try again or rephrase your request?",
  };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
