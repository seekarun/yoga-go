/**
 * OpenAI Integration for Business Setup Chat
 * Uses function calling to extract structured business information
 */

import type { BusinessInfo } from "@/types/ai-assistant";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIMessage {
  role: "system" | "user" | "assistant";
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

interface OpenAIChoice {
  index: number;
  message: OpenAIMessage;
  finish_reason: string;
}

interface OpenAIResponse {
  id: string;
  choices: OpenAIChoice[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * The function schema for extracting business info
 */
const EXTRACT_BUSINESS_INFO_FUNCTION = {
  type: "function" as const,
  function: {
    name: "save_business_info",
    description:
      "Save the extracted business information. Call this when you have gathered enough information from the user, including asking if there's anything else.",
    parameters: {
      type: "object",
      properties: {
        businessName: {
          type: "string",
          description: "The name of the business",
        },
        description: {
          type: "string",
          description: "A brief description of what the business does",
        },
        openingHours: {
          type: "string",
          description: "The business opening hours (e.g., Mon-Fri 9am-5pm)",
        },
        services: {
          type: "string",
          description: "The services or products offered",
        },
        location: {
          type: "string",
          description: "The business location or address",
        },
        contactInfo: {
          type: "string",
          description: "Contact information (email, phone)",
        },
        additionalNotes: {
          type: "string",
          description:
            "Any additional information the user wants to share (from the 'anything else' question)",
        },
      },
      required: [],
    },
  },
};

/**
 * System prompt for the setup assistant
 */
const SETUP_SYSTEM_PROMPT = `You are a friendly assistant helping a business owner set up their AI chat widget. Your goal is to learn about their business so the chat widget can answer visitor questions accurately.

Have a natural conversation to gather the following information:
- Business name
- What they do (brief description)
- Opening hours
- Services or products offered
- Location (if applicable)
- Contact information

Guidelines:
- Be conversational and friendly, not like a form
- Ask one or two questions at a time
- Acknowledge their answers before asking the next question
- If they give partial info, that's okay - don't push too hard
- Keep responses short and friendly
- IMPORTANT: After gathering the main details, ALWAYS ask "Is there anything else you'd like visitors to know about your business?" as your final question
- Only call the save_business_info function AFTER asking the "anything else" question and receiving a response (even if they say "no" or "that's all")

Start by introducing yourself and asking about their business name.`;

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

export interface SetupChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface SetupChatResponse {
  message: string;
  businessInfo?: BusinessInfo;
  isComplete: boolean;
}

/**
 * Process a setup chat message and potentially extract business info
 */
export async function processSetupChat(
  messages: SetupChatMessage[],
): Promise<SetupChatResponse> {
  console.log("[DBG][openai-setup] Processing setup chat");

  const apiKey = getApiKey();
  const model = getModel();

  // Build messages array for OpenAI
  const openAIMessages: OpenAIMessage[] = [
    { role: "system", content: SETUP_SYSTEM_PROMPT },
    ...messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  console.log("[DBG][openai-setup] Message count:", openAIMessages.length);

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: openAIMessages,
      tools: [EXTRACT_BUSINESS_INFO_FUNCTION],
      tool_choice: "auto",
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[DBG][openai-setup] API error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    console.error("[DBG][openai-setup] No choices in response");
    throw new Error("No response from OpenAI");
  }

  const choice = data.choices[0];
  const assistantMessage = choice.message;

  console.log(
    "[DBG][openai-setup] Response received, finish_reason:",
    choice.finish_reason,
  );

  // Check if the model wants to call the function
  if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0];

    if (toolCall.function.name === "save_business_info") {
      console.log("[DBG][openai-setup] Function called - extracting info");

      try {
        const businessInfo = JSON.parse(
          toolCall.function.arguments,
        ) as BusinessInfo;

        // Clean up empty strings
        const cleanedInfo: BusinessInfo = {};
        if (businessInfo.businessName?.trim()) {
          cleanedInfo.businessName = businessInfo.businessName.trim();
        }
        if (businessInfo.description?.trim()) {
          cleanedInfo.description = businessInfo.description.trim();
        }
        if (businessInfo.openingHours?.trim()) {
          cleanedInfo.openingHours = businessInfo.openingHours.trim();
        }
        if (businessInfo.services?.trim()) {
          cleanedInfo.services = businessInfo.services.trim();
        }
        if (businessInfo.location?.trim()) {
          cleanedInfo.location = businessInfo.location.trim();
        }
        if (businessInfo.contactInfo?.trim()) {
          cleanedInfo.contactInfo = businessInfo.contactInfo.trim();
        }
        if (businessInfo.additionalNotes?.trim()) {
          cleanedInfo.additionalNotes = businessInfo.additionalNotes.trim();
        }

        console.log(
          "[DBG][openai-setup] Extracted info:",
          Object.keys(cleanedInfo),
        );

        return {
          message:
            assistantMessage.content ||
            "I've gathered your business information. Let me save that for you.",
          businessInfo: cleanedInfo,
          isComplete: true,
        };
      } catch (err) {
        console.error("[DBG][openai-setup] Error parsing function args:", err);
      }
    }
  }

  // Regular response - continue conversation
  return {
    message: assistantMessage.content || "Could you tell me more?",
    isComplete: false,
  };
}
