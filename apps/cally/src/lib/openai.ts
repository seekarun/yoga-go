/**
 * OpenAI Integration for Cally AI Assistant
 */

import type { ChatMessage, BusinessInfo } from "@/types/ai-assistant";
import { DEFAULT_SYSTEM_PROMPT } from "@/types/ai-assistant";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Build a system prompt that includes business information
 */
export function buildSystemPrompt(
  customPrompt?: string,
  businessInfo?: BusinessInfo,
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

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
      content: string;
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

  const content = data.choices[0].message.content;
  console.log(
    "[DBG][openai] Response received, tokens:",
    data.usage?.total_tokens,
  );

  return { content };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
