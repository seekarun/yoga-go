/**
 * AI Assistant Types for Cally
 * Types for chat widget and AI configuration
 */

/**
 * Widget position options
 */
export type WidgetPosition = "bottom-right" | "bottom-left";

/**
 * Chat message role
 */
export type ChatRole = "user" | "assistant" | "system";

/**
 * Business information for AI context
 */
export interface BusinessInfo {
  businessName?: string;
  description?: string;
  openingHours?: string;
  services?: string;
  contactInfo?: string;
  location?: string;
  additionalNotes?: string;
}

/**
 * AI Assistant configuration stored per tenant
 */
export interface AiAssistantConfig {
  enabled: boolean;
  enabledAt?: string;
  systemPrompt?: string;
  widgetPosition: WidgetPosition;
  welcomeMessage: string;
  placeholderText: string;
  businessInfo?: BusinessInfo;
}

/**
 * Chat message in conversation
 */
export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  timestamp: string;
}

/**
 * Request for chat completion
 */
export interface ChatCompletionRequest {
  message: string;
  sessionMessages?: ChatMessage[];
}

/**
 * Response from chat completion
 */
export interface ChatCompletionResponse {
  message: ChatMessage;
}

/**
 * AI settings status response
 */
export interface AiSettingsResponse {
  enabled: boolean;
  config: AiAssistantConfig;
}

/**
 * Default configuration for AI Assistant
 */
export const DEFAULT_AI_ASSISTANT_CONFIG: AiAssistantConfig = {
  enabled: false,
  widgetPosition: "bottom-right",
  welcomeMessage: "Hi! How can I help you today?",
  placeholderText: "Type your message...",
};

/**
 * Default system prompt for AI Assistant
 */
export const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant for a professional service provider.
Be friendly, concise, and helpful. Answer questions about services, availability, and general inquiries.
Keep responses brief and to the point.`;
