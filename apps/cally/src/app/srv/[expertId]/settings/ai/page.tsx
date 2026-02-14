"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import { BusinessSetupChat, VoiceAssistantModal } from "@/components/ai";
import type { AiAssistantConfig, WidgetPosition, BusinessInfo } from "@/types";
import { DEFAULT_AI_ASSISTANT_CONFIG } from "@/types/ai-assistant";

export default function AiSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<AiAssistantConfig>(
    DEFAULT_AI_ASSISTANT_CONFIG,
  );
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Setup chat modal state
  const [isSetupChatOpen, setIsSetupChatOpen] = useState(false);

  // Voice assistant modal state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);

  // Widget form state
  const [widgetPosition, setWidgetPosition] =
    useState<WidgetPosition>("bottom-right");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [placeholderText, setPlaceholderText] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");

  // Business info form state
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [services, setServices] = useState("");
  const [location, setLocation] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/data/app/ai/settings");
      const data = await response.json();

      if (data.success) {
        const cfg = data.data.config as AiAssistantConfig;
        setConfig(cfg);

        // Widget settings
        setWidgetPosition(cfg.widgetPosition);
        setWelcomeMessage(cfg.welcomeMessage);
        setPlaceholderText(cfg.placeholderText);
        setSystemPrompt(cfg.systemPrompt || "");

        // Business info
        const biz = cfg.businessInfo || {};
        setBusinessName(biz.businessName || "");
        setBusinessDescription(biz.description || "");
        setOpeningHours(biz.openingHours || "");
        setServices(biz.services || "");
        setLocation(biz.location || "");
        setContactInfo(biz.contactInfo || "");
        setAdditionalNotes(biz.additionalNotes || "");
      } else {
        setError(data.error || "Failed to load settings");
      }
    } catch (err) {
      console.error("[DBG][ai-settings] Error fetching settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Build business info object (only include non-empty fields)
    const businessInfo: BusinessInfo = {};
    if (businessName.trim()) businessInfo.businessName = businessName.trim();
    if (businessDescription.trim())
      businessInfo.description = businessDescription.trim();
    if (openingHours.trim()) businessInfo.openingHours = openingHours.trim();
    if (services.trim()) businessInfo.services = services.trim();
    if (location.trim()) businessInfo.location = location.trim();
    if (contactInfo.trim()) businessInfo.contactInfo = contactInfo.trim();
    if (additionalNotes.trim())
      businessInfo.additionalNotes = additionalNotes.trim();

    try {
      const response = await fetch("/api/data/app/ai/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          widgetPosition,
          welcomeMessage: welcomeMessage.trim(),
          placeholderText: placeholderText.trim(),
          systemPrompt: systemPrompt.trim() || undefined,
          businessInfo:
            Object.keys(businessInfo).length > 0 ? businessInfo : undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data.config);
        setSuccessMessage("Settings saved successfully!");
      } else {
        setError(data.error || "Failed to save settings");
      }
    } catch (err) {
      console.error("[DBG][ai-settings] Error saving:", err);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Check if form has changes
  const currentBiz = config.businessInfo || {};
  const hasChanges =
    widgetPosition !== config.widgetPosition ||
    welcomeMessage !== config.welcomeMessage ||
    placeholderText !== config.placeholderText ||
    systemPrompt !== (config.systemPrompt || "") ||
    businessName !== (currentBiz.businessName || "") ||
    businessDescription !== (currentBiz.description || "") ||
    openingHours !== (currentBiz.openingHours || "") ||
    services !== (currentBiz.services || "") ||
    location !== (currentBiz.location || "") ||
    contactInfo !== (currentBiz.contactInfo || "") ||
    additionalNotes !== (currentBiz.additionalNotes || "");

  // Handle setup chat completion - update form fields with extracted info
  const handleSetupComplete = (info: BusinessInfo) => {
    if (info.businessName) setBusinessName(info.businessName);
    if (info.description) setBusinessDescription(info.description);
    if (info.openingHours) setOpeningHours(info.openingHours);
    if (info.services) setServices(info.services);
    if (info.location) setLocation(info.location);
    if (info.contactInfo) setContactInfo(info.contactInfo);
    if (info.additionalNotes) setAdditionalNotes(info.additionalNotes);

    // Also update the config to reflect the saved data
    setConfig((prev) => ({
      ...prev,
      businessInfo: { ...prev.businessInfo, ...info },
    }));

    setSuccessMessage("Business information saved from setup chat!");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            AI Assistant Settings
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Configure how your AI assistant behaves.
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push(`/srv/${expertId}/ai-assistant`)}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              AI Assistant Settings
            </h1>
          </div>
          <p className="text-[var(--text-muted)] ml-8">
            Configure your AI assistant&apos;s appearance and behavior.
          </p>
        </div>
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

      <div className="max-w-2xl space-y-6">
        {/* Business Information */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Business Information
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Talk to AI
              </button>
              <button
                type="button"
                onClick={() => setIsSetupChatOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
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
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Set up with AI
              </button>
            </div>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-5 ml-11">
            Help the AI answer questions about your business accurately.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Business Name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g., Sunrise Yoga Studio"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Description
              </label>
              <textarea
                value={businessDescription}
                onChange={(e) => setBusinessDescription(e.target.value)}
                placeholder="Brief description of your business and what you do..."
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Opening Hours
              </label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="e.g., Mon-Fri 6am-8pm, Sat-Sun 8am-6pm"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Services Offered
              </label>
              <textarea
                value={services}
                onChange={(e) => setServices(e.target.value)}
                placeholder="e.g., Hatha Yoga, Vinyasa Flow, Private Sessions, Corporate Classes"
                rows={2}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., 123 Main St, Sydney NSW 2000"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Contact Information
              </label>
              <input
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="e.g., hello@example.com, 0400 123 456"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Additional Notes
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Anything else visitors should know about your business..."
                rows={3}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        {/* Widget Position */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-1">
            Widget Position
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Choose where the chat button appears on your landing page.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setWidgetPosition("bottom-right")}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                widgetPosition === "bottom-right"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              Bottom Right
            </button>
            <button
              type="button"
              onClick={() => setWidgetPosition("bottom-left")}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                widgetPosition === "bottom-left"
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              Bottom Left
            </button>
          </div>
        </div>

        {/* Welcome Message */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-1">
            Welcome Message
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            The first message visitors see when they open the chat.
          </p>
          <input
            type="text"
            value={welcomeMessage}
            onChange={(e) => setWelcomeMessage(e.target.value)}
            placeholder="Hi! How can I help you today?"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>

        {/* Placeholder Text */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-1">
            Input Placeholder
          </h2>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Placeholder text shown in the message input field.
          </p>
          <input
            type="text"
            value={placeholderText}
            onChange={(e) => setPlaceholderText(e.target.value)}
            placeholder="Type your message..."
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        </div>

        {/* Advanced: Custom Instructions */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Custom Instructions
            </h2>
            <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded">
              Advanced
            </span>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-4">
            Additional instructions for the AI. The business info above is
            automatically included.
          </p>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="e.g., Always suggest booking a trial class. Don't discuss competitor studios."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-none"
          />
        </div>

        {/* Knowledge Base */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-main)]">
                  Knowledge Base
                </h2>
                <p className="text-sm text-[var(--text-muted)]">
                  Add FAQs, pricing, policies, and other info for the AI to
                  reference.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                router.push(`/srv/${expertId}/settings/ai/knowledge`)
              }
              className="px-4 py-2 text-sm font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/10 rounded-lg hover:bg-[var(--color-primary)]/20 transition-colors"
            >
              Manage
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/srv/${expertId}/ai-assistant`)}
            className="px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Business Setup Chat Modal */}
      <BusinessSetupChat
        isOpen={isSetupChatOpen}
        onClose={() => setIsSetupChatOpen(false)}
        onComplete={handleSetupComplete}
        existingInfo={config.businessInfo}
      />

      {/* Voice Assistant Modal */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
      />
    </div>
  );
}
