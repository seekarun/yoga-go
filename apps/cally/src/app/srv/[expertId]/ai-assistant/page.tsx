"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";
import ChatWidget from "@/components/ai/ChatWidget";
import { VoiceAssistantModal } from "@/components/ai";
import type { AiAssistantConfig } from "@/types";
import { DEFAULT_AI_ASSISTANT_CONFIG } from "@/types/ai-assistant";

export default function AiAssistantPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AiAssistantConfig>(
    DEFAULT_AI_ASSISTANT_CONFIG,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/data/app/ai/settings");
      const data = await response.json();

      if (data.success) {
        setConfig(data.data.config);
      } else {
        setError(data.error || "Failed to load settings");
      }
    } catch (err) {
      console.error("[DBG][ai-assistant] Error fetching settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Toggle enabled status
  const handleToggleEnabled = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/data/app/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !config.enabled }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data.config);
        setSuccessMessage(
          data.data.config.enabled
            ? "AI Assistant enabled! It will now appear on your landing page."
            : "AI Assistant disabled.",
        );
      } else {
        setError(data.error || "Failed to update settings");
      }
    } catch (err) {
      console.error("[DBG][ai-assistant] Error toggling:", err);
      setError("Failed to update settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            AI Assistant
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Add an AI-powered chat widget to your landing page.
          </p>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          AI Assistant
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Add an AI-powered chat widget to your landing page to help visitors
          with questions.
        </p>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-600">
          {successMessage}
        </div>
      )}

      <div className="max-w-4xl space-y-6">
        {/* Voice Assistant Card */}
        <div className="bg-gradient-to-r from-[var(--color-primary,#6366f1)] to-[var(--color-primary,#6366f1)]/80 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">
                  Talk to your AI Assistant
                </h2>
                <p className="text-sm text-white/80">
                  Set up your business by voice — describe your services, hours,
                  and more
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsVoiceModalOpen(true)}
              className="px-5 py-2.5 bg-white text-[var(--color-primary,#6366f1)] rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors"
            >
              Start Voice Chat
            </button>
          </div>
        </div>

        {/* Enable/Disable Card */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-[var(--color-primary)]"
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
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-main)]">
                  Enable AI Chat Widget
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  {config.enabled
                    ? "The chat widget is visible on your landing page"
                    : "Enable to show chat widget on your landing page"}
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleEnabled}
              disabled={saving}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? "bg-[var(--color-primary)]" : "bg-gray-200"
              } ${saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {config.enabled && config.enabledAt && (
            <p className="mt-4 text-xs text-[var(--text-muted)]">
              Enabled since{" "}
              {new Date(config.enabledAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>

        {/* Settings Link Card */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-main)]">
                  Customize Settings
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Configure widget position, welcome message, and AI behavior
                </p>
              </div>
            </div>
            <Link
              href={`/srv/${expertId}/settings/ai`}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
            >
              Configure
            </Link>
          </div>
        </div>

        {/* Demo Section */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-2">
            Try It Out
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            Test the AI Assistant below. Click the chat bubble in the corner to
            open the chat widget.
          </p>

          {/* Demo container with chat widget */}
          <div className="relative bg-gray-100 rounded-lg h-96 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <p className="text-sm">Click the chat bubble to start</p>
              </div>
            </div>
            {/* Demo chat widget - positioned within this container */}
            <div className="absolute bottom-4 right-4">
              <ChatWidget
                tenantId={expertId}
                config={config}
                isDemo={true}
                apiEndpoint="/api/data/app/ai/chat"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
}
