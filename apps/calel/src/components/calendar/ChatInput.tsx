"use client";

/**
 * ChatInput Component
 *
 * A prominent text input for natural language calendar commands.
 * Examples:
 * - "unavailable for all hours except 9 to 5 weekdays"
 * - "available Monday to Friday 9am to 5pm"
 * - "block off December 25th"
 */

import { useState, useRef, useEffect } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
}

const EXAMPLE_COMMANDS = [
  "Available 9am to 5pm weekdays",
  "Block off this Friday afternoon",
  "Available every Saturday 10am to 2pm",
  "Unavailable December 24-26",
  "Clear all availability for next week",
];

export function ChatInput({
  onSubmit,
  isProcessing = false,
  placeholder = "Tell me about your availability...",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      onSubmit(message.trim());
      setMessage("");
      setShowExamples(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleExampleClick = (example: string) => {
    setMessage(example);
    setShowExamples(false);
    inputRef.current?.focus();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <textarea
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowExamples(true)}
            onBlur={() => setTimeout(() => setShowExamples(false), 200)}
            placeholder={placeholder}
            disabled={isProcessing}
            className="w-full px-4 py-4 pr-24 text-lg resize-none border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
            rows={1}
          />

          <div className="absolute right-2 bottom-2 flex items-center gap-2">
            {isProcessing ? (
              <div className="flex items-center gap-2 px-3 py-2 text-gray-500">
                <svg
                  className="animate-spin h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="text-sm">Processing...</span>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!message.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <span>Apply</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Example commands */}
        {showExamples && !message && (
          <div className="border-t px-4 py-3 bg-gray-50">
            <p className="text-xs text-gray-500 mb-2 font-medium">
              Try saying:
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_COMMANDS.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => handleExampleClick(example)}
                  className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-full text-gray-700 hover:bg-gray-100 hover:border-gray-300 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
