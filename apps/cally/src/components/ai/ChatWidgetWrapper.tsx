"use client";

import ChatWidget from "./ChatWidget";
import type { AiAssistantConfig } from "@/types";

interface ChatWidgetWrapperProps {
  tenantId: string;
  config?: AiAssistantConfig;
}

/**
 * Client wrapper for ChatWidget in server components
 * Only renders if AI assistant is enabled
 */
export default function ChatWidgetWrapper({
  tenantId,
  config,
}: ChatWidgetWrapperProps) {
  if (!config?.enabled) {
    return null;
  }

  return <ChatWidget tenantId={tenantId} config={config} isDemo={false} />;
}
