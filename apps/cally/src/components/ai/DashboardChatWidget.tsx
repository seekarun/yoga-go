"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "@/types/ai-assistant";

const ENDPOINT = "/api/data/app/ai/chat";
const WELCOME_MESSAGE =
  "Hi! I'm your business assistant. Ask me for a daily brief, appointment details, or email updates.";

/**
 * Renders assistant markdown content with styled HTML.
 */
function AssistantMessage({ content }: { content: string }) {
  return (
    <div className="assistant-md text-sm">
      <ReactMarkdown
        components={{
          h3: ({ children }) => (
            <h3 className="font-semibold text-gray-900 text-sm mt-2 mb-1">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="font-semibold text-gray-800 text-xs mt-1.5 mb-0.5">
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className="text-gray-700 mb-1 last:mb-0 leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => <ul className="space-y-1 my-1">{children}</ul>,
          ol: ({ children }) => (
            <ol className="space-y-1 my-1 list-decimal list-inside">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-gray-700 leading-relaxed flex items-start gap-1.5">
              <span className="text-[var(--color-primary,#6366f1)] mt-1 shrink-0">
                &bull;
              </span>
              <span>{children}</span>
            </li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-gray-900">{children}</strong>
          ),
          em: ({ children }) => <em className="text-gray-500">{children}</em>,
          hr: () => <hr className="border-gray-200 my-2" />,
          code: ({ children }) => (
            <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-xs font-mono">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

/**
 * Chat widget for the tenant dashboard (bottom-right corner).
 * Uses the authenticated /api/data/app/ai/chat endpoint with tool calling.
 */
export default function DashboardChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Send message
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
      const response = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          sessionMessages: messages,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [...prev, data.data.message]);
      } else {
        setError(data.error || "Failed to get response");
      }
    } catch (err) {
      console.error("[DBG][DashboardChatWidget] Error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, messages]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 sm:bottom-6 right-4 sm:right-6 z-50">
      {/* Chat Panel */}
      {isOpen && (
        <div
          className="absolute bottom-16 right-0 origin-bottom-right w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          style={{ maxHeight: "calc(100vh - 120px)" }}
        >
          {/* Header */}
          <div className="bg-[var(--color-primary,#6366f1)] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
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
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.433 5.015a1.5 1.5 0 01-1.44 1.085H7.873a1.5 1.5 0 01-1.44-1.085L5 14.5m14 0H5"
                  />
                </svg>
              </div>
              <div className="font-semibold text-sm">Business Assistant</div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="h-96 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {/* Welcome message */}
            {messages.length === 0 && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-4 py-2 rounded-2xl rounded-bl-none bg-white border border-gray-200 text-gray-800 text-sm">
                  {WELCOME_MESSAGE}
                </div>
              </div>
            )}

            {/* Chat messages */}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[80%] px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap bg-[var(--color-primary,#6366f1)] text-white rounded-br-none">
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[90%] px-4 py-2.5 rounded-2xl bg-white border border-gray-200 rounded-bl-none">
                    <AssistantMessage content={msg.content} />
                  </div>
                )}
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
          <div className="p-3 border-t border-gray-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask about your day, appointments, emails..."
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
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 ${
          isOpen
            ? "bg-gray-600 hover:bg-gray-700"
            : "bg-[var(--color-primary,#6366f1)] hover:bg-[var(--color-primary-hover,#4f46e5)]"
        }`}
      >
        {isOpen ? (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-1.433 5.015a1.5 1.5 0 01-1.44 1.085H7.873a1.5 1.5 0 01-1.44-1.085L5 14.5m14 0H5"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
