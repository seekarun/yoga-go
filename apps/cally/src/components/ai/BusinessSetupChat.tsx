"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { BusinessInfo } from "@/types/ai-assistant";

interface SetupMessage {
  role: "user" | "assistant";
  content: string;
}

interface BusinessSetupChatProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (businessInfo: BusinessInfo) => void;
  existingInfo?: BusinessInfo;
}

export default function BusinessSetupChat({
  isOpen,
  onClose,
  onComplete,
  existingInfo: _existingInfo,
}: BusinessSetupChatProps) {
  const [messages, setMessages] = useState<SetupMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedInfo, setExtractedInfo] = useState<BusinessInfo | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when modal opens and start conversation
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();

      // Start the conversation if no messages yet
      if (messages.length === 0) {
        startConversation();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Start the conversation with an initial AI message
  const startConversation = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Send empty messages to get the initial greeting
      const response = await fetch("/api/data/app/ai/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [] }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages([{ role: "assistant", content: data.data.message }]);
      } else {
        setError(data.error || "Failed to start setup");
      }
    } catch (err) {
      console.error("[DBG][BusinessSetupChat] Error starting:", err);
      setError("Failed to start setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send a message
  const sendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading || isComplete) return;

    const userMessage = inputValue.trim();
    setInputValue("");
    setError(null);

    // Add user message to UI
    const newMessages: SetupMessage[] = [
      ...messages,
      { role: "user", content: userMessage },
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/data/app/ai/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          saveIfComplete: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add assistant response
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.data.message },
        ]);

        // Check if setup is complete
        if (data.data.isComplete && data.data.businessInfo) {
          setExtractedInfo(data.data.businessInfo);
          setIsComplete(true);
        }
      } else {
        setError(data.error || "Failed to get response");
      }
    } catch (err) {
      console.error("[DBG][BusinessSetupChat] Error:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isComplete, messages]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle completion
  const handleConfirm = () => {
    if (extractedInfo) {
      onComplete(extractedInfo);
      handleClose();
    }
  };

  // Reset and close
  const handleClose = () => {
    setMessages([]);
    setInputValue("");
    setError(null);
    setExtractedInfo(null);
    setIsComplete(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[var(--color-primary,#6366f1)] text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
            <div>
              <h2 className="font-semibold">Business Setup</h2>
              <p className="text-sm text-white/80">
                Let me learn about your business
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
        <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[var(--color-primary,#6366f1)] text-white rounded-br-none"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-2xl rounded-bl-none bg-white border border-gray-200 shadow-sm">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.15s" }}
                  />
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0.3s" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex justify-center">
              <div className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs">
                {error}
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Extracted Info Summary (when complete) */}
        {isComplete && extractedInfo && (
          <div className="px-4 py-3 bg-green-50 border-t border-green-100">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800">
                  Here&apos;s what I learned:
                </p>
                <ul className="mt-1 text-xs text-green-700 space-y-0.5">
                  {extractedInfo.businessName && (
                    <li>
                      <strong>Name:</strong> {extractedInfo.businessName}
                    </li>
                  )}
                  {extractedInfo.description && (
                    <li>
                      <strong>About:</strong> {extractedInfo.description}
                    </li>
                  )}
                  {extractedInfo.openingHours && (
                    <li>
                      <strong>Hours:</strong> {extractedInfo.openingHours}
                    </li>
                  )}
                  {extractedInfo.services && (
                    <li>
                      <strong>Services:</strong> {extractedInfo.services}
                    </li>
                  )}
                  {extractedInfo.location && (
                    <li>
                      <strong>Location:</strong> {extractedInfo.location}
                    </li>
                  )}
                  {extractedInfo.contactInfo && (
                    <li>
                      <strong>Contact:</strong> {extractedInfo.contactInfo}
                    </li>
                  )}
                  {extractedInfo.additionalNotes && (
                    <li>
                      <strong>Other:</strong> {extractedInfo.additionalNotes}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-white">
          {isComplete ? (
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 px-4 py-2.5 bg-[var(--color-primary,#6366f1)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-hover,#4f46e5)] transition-colors"
              >
                Save & Continue
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your answer..."
                disabled={isLoading}
                className="flex-1 px-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-primary,#6366f1)] focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
              <button
                onClick={sendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2.5 bg-[var(--color-primary,#6366f1)] text-white rounded-lg hover:bg-[var(--color-primary-hover,#4f46e5)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          )}
        </div>
      </div>
    </div>
  );
}
