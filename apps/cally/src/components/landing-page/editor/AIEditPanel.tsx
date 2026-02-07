"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type {
  LandingPageConfig,
  Section,
  SectionType,
} from "@/types/landing-page";

interface AIEditPanelProps {
  /** Current landing page configuration */
  config: LandingPageConfig;
  /** Callback when AI generates new sections */
  onApplyChanges: (sections: Section[]) => void;
  /** Whether the panel is expanded */
  isExpanded?: boolean;
  /** Toggle expanded state */
  onToggleExpand?: () => void;
}

interface AIEditChange {
  type: "added" | "modified" | "removed" | "reordered";
  section: SectionType;
  field?: string;
}

interface AIEditResult {
  sections: Section[];
  summary: string;
  changes: AIEditChange[];
}

/**
 * AIEditPanel Component
 *
 * Floating panel for AI-powered landing page editing.
 * Users can enter natural language prompts to modify the page.
 */
export default function AIEditPanel({
  config,
  onApplyChanges,
  isExpanded = false,
  onToggleExpand,
}: AIEditPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AIEditResult | null>(null);
  const [showResult, setShowResult] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // Handle AI edit request
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!prompt.trim() || isLoading) return;

      setIsLoading(true);
      setError("");
      setResult(null);
      setShowResult(false);

      try {
        console.log("[DBG][AIEditPanel] Submitting AI edit request");

        const response = await fetch(
          "/api/data/app/tenant/landing-page/ai-edit",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              prompt: prompt.trim(),
              currentConfig: config,
            }),
          },
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to generate AI edit");
        }

        console.log("[DBG][AIEditPanel] AI edit received:", data.data.summary);

        setResult({
          sections: data.data.sections,
          summary: data.data.summary,
          changes: data.data.changes,
        });
        setShowResult(true);
      } catch (err) {
        console.error("[DBG][AIEditPanel] Error:", err);
        setError(err instanceof Error ? err.message : "AI edit failed");
      } finally {
        setIsLoading(false);
      }
    },
    [prompt, config, isLoading],
  );

  // Handle accept changes
  const handleAccept = useCallback(() => {
    if (result) {
      onApplyChanges(result.sections);
      setPrompt("");
      setResult(null);
      setShowResult(false);
    }
  }, [result, onApplyChanges]);

  // Handle reject changes
  const handleReject = useCallback(() => {
    setResult(null);
    setShowResult(false);
    setPrompt("");
  }, []);

  // Collapsed state - just show the floating button
  if (!isExpanded) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
        title="AI Edit"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </button>
    );
  }

  // Expanded state - show the full panel
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-2xl">
      {/* Result Preview (when showing changes) */}
      {showResult && result && (
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900">
                  AI Changes Ready
                </h3>
                <p className="text-sm text-gray-600">{result.summary}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Accept Changes
                </button>
              </div>
            </div>

            {/* Changes list */}
            <div className="flex flex-wrap gap-2">
              {result.changes.map((change, index) => (
                <span
                  key={index}
                  className={`px-2 py-1 text-xs rounded-full ${
                    change.type === "added"
                      ? "bg-green-100 text-green-800"
                      : change.type === "removed"
                        ? "bg-red-100 text-red-800"
                        : change.type === "reordered"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {change.type === "added" && "+ "}
                  {change.type === "removed" && "- "}
                  {change.type === "modified" && "~ "}
                  {change.type === "reordered" && "↕ "}
                  {change.section}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Error message */}
          {error && (
            <div className="mb-3 px-4 py-2 bg-red-50 border border-red-200 text-red-800 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-600 hover:text-red-800"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            {/* Close button */}
            <button
              type="button"
              onClick={onToggleExpand}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Close AI panel"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* AI icon */}
            <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>

            {/* Input field */}
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder='Try: "Add a testimonials section" or "Rewrite the hero for a yoga instructor"'
              className="flex-1 px-4 py-3 bg-gray-100 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />

            {/* Submit button */}
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  Generate
                </>
              )}
            </button>
          </form>

          {/* Example prompts */}
          {!showResult && !isLoading && (
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500">Try:</span>
              {[
                "Add a testimonials section",
                "Add FAQ section",
                "Add pricing tiers",
                "Rewrite for a yoga instructor",
                "Make it more professional",
              ].map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setPrompt(example)}
                  className="px-2 py-1 text-xs text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {example}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
