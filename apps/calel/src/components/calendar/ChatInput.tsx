"use client";

/**
 * ChatInput Component
 *
 * A prominent text input for natural language calendar commands.
 * Supports: creating events, updating events, deleting events,
 * finding availability, querying calendar, setting availability.
 */

import { useState, useRef } from "react";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isProcessing?: boolean;
  placeholder?: string;
}

const EXAMPLE_COMMANDS = [
  // Event creation
  "Block 2pm tomorrow for lunch with Sarah",
  "Schedule dentist at 10am next Monday",
  // Event management
  "Cancel my 3pm meeting",
  "Move standup to 10am",
  // Queries
  "What's on my calendar tomorrow?",
  "Find next 30 min free slot",
  // Availability
  "Available 9-5 weekdays",
];

export function ChatInput({
  onSubmit,
  isProcessing = false,
  placeholder = "Try 'Schedule lunch at 2pm tomorrow' or 'What's on today?'",
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const [showExamples, setShowExamples] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isProcessing) {
      onSubmit(message.trim());
      setMessage("");
      setShowExamples(false);
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
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onFocus={() => setShowExamples(true)}
            onBlur={() => setTimeout(() => setShowExamples(false), 200)}
            placeholder={placeholder}
            disabled={isProcessing}
            className="w-full px-4 py-3 pr-14 text-base border-0 focus:ring-0 focus:outline-none placeholder-gray-400"
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {isProcessing ? (
              <div className="flex items-center gap-1 px-2 text-gray-500">
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
              </div>
            ) : (
              <button
                type="submit"
                disabled={!message.trim()}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
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
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
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
