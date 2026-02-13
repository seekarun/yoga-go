"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { ChatMessage } from "@/types/ai-assistant";
import { DEFAULT_AI_ASSISTANT_CONFIG } from "@/types/ai-assistant";
import { useEmbedMessaging } from "@/hooks/useEmbedMessaging";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { useVisitorTimezone } from "@/hooks/useVisitorTimezone";

interface EmbedChatWidgetProps {
  tenantId: string;
}

/**
 * Embeddable chat widget — always-open, fills the entire iframe.
 * No toggle button or close button (parent page controls visibility).
 */
export default function EmbedChatWidget({ tenantId }: EmbedChatWidgetProps) {
  useEmbedMessaging("chat");
  const auth = useOptionalAuth();
  const [visitorTimezone] = useVisitorTimezone();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const endpoint = `/api/data/tenants/${tenantId}/ai/chat`;
  const config = DEFAULT_AI_ASSISTANT_CONFIG;

  // Build visitor info from auth state + user-selected timezone
  const visitorInfo = useMemo(() => {
    const info: { name?: string; email?: string; timezone?: string } = {};
    if (auth?.isAuthenticated && auth.user) {
      if (auth.user.profile.name) info.name = auth.user.profile.name;
      if (auth.user.profile.email) info.email = auth.user.profile.email;
    }
    if (visitorTimezone) {
      info.timezone = visitorTimezone;
    }
    return Object.keys(info).length > 0 ? info : undefined;
  }, [auth?.isAuthenticated, auth?.user, visitorTimezone]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    const tempUserMessage: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionMessages: messages,
          visitorInfo,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [...prev, data.data.message]);
      } else {
        setError(data.error || "Failed to get response");
      }
    } catch (err) {
      console.error("[DBG][EmbedChatWidget] Error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, endpoint, messages, visitorInfo]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-white">
      {/* Header */}
      <div className="bg-[var(--color-primary,#6366f1)] text-white px-4 py-3 flex items-center gap-2 shrink-0">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </div>
        <div className="font-semibold text-sm">AI Assistant</div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-2 rounded-2xl rounded-bl-none bg-white border border-gray-200 text-gray-800 text-sm">
              {config.welcomeMessage}
            </div>
          </div>
        )}

        {/* Chat messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-[var(--color-primary,#6366f1)] text-white rounded-br-none"
                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-bl-none bg-white border border-gray-200">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                />
                <div
                  className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex justify-center">
            <div className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-200 bg-white shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={config.placeholderText}
            disabled={isLoading}
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !inputValue.trim()}
            className="px-3 py-2 bg-[var(--color-primary,#6366f1)] text-white rounded-lg hover:bg-[var(--color-primary-hover,#4f46e5)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
