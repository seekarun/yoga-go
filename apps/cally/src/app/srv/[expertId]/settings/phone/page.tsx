"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { PhoneConfig, DayOfWeek, TtsVoice } from "@/types/phone-calling";
import {
  DEFAULT_PHONE_CONFIG,
  SUPPORTED_TIMEZONES,
  DAY_NAMES,
  VOICE_OPTIONS,
} from "@/types/phone-calling";

export default function PhoneSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<PhoneConfig>(DEFAULT_PHONE_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Phone verification state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Briefing settings state
  const [briefingEnabled, setBriefingEnabled] = useState(false);
  const [briefingTime, setBriefingTime] = useState("07:30");
  const [briefingTimezone, setBriefingTimezone] = useState("Australia/Sydney");
  const [briefingDays, setBriefingDays] = useState<DayOfWeek[]>([
    1, 2, 3, 4, 5,
  ]);
  const [voiceId, setVoiceId] = useState<TtsVoice>("nova");
  const [includeCalendar, setIncludeCalendar] = useState(true);
  const [includeEmails, setIncludeEmails] = useState(true);

  // Test call state
  const [testingCall, setTestingCall] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch("/api/data/app/phone/settings");
      const data = await response.json();

      if (data.success) {
        const cfg = data.data.config as PhoneConfig;
        setConfig(cfg);

        // Phone settings
        setPhoneNumber(cfg.phoneNumber || "");

        // Briefing settings
        setBriefingEnabled(cfg.morningBriefingEnabled);
        setBriefingTime(cfg.morningBriefingTime || "07:30");
        setBriefingTimezone(cfg.morningBriefingTimezone || "Australia/Sydney");
        setBriefingDays(cfg.morningBriefingDays || [1, 2, 3, 4, 5]);
        setVoiceId(cfg.voiceId || "nova");
        setIncludeCalendar(cfg.includeCalendarEvents !== false);
        setIncludeEmails(cfg.includeUnreadEmails !== false);
      } else {
        setError(data.error || "Failed to load settings");
      }
    } catch (err) {
      console.error("[DBG][phone-settings] Error fetching settings:", err);
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Send verification code
  const handleSendVerification = async () => {
    if (!phoneNumber.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/data/app/phone/verify/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setVerificationSent(true);
        setSuccessMessage("Verification code sent to your phone");
        // Update phone number to formatted version
        setPhoneNumber(data.data.phoneNumber);
      } else {
        setError(data.error || "Failed to send verification code");
      }
    } catch (err) {
      console.error("[DBG][phone-settings] Error sending verification:", err);
      setError("Failed to send verification code");
    } finally {
      setIsVerifying(false);
    }
  };

  // Confirm verification
  const handleConfirmVerification = async () => {
    if (!verificationCode.trim()) {
      setError("Please enter the verification code");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch("/api/data/app/phone/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          code: verificationCode.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data.config);
        setVerificationSent(false);
        setVerificationCode("");
        setSuccessMessage("Phone number verified successfully!");
      } else {
        setError(data.error || "Failed to verify code");
      }
    } catch (err) {
      console.error(
        "[DBG][phone-settings] Error confirming verification:",
        err,
      );
      setError("Failed to verify code");
    } finally {
      setIsVerifying(false);
    }
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/data/app/phone/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          morningBriefingEnabled: briefingEnabled,
          morningBriefingTime: briefingTime,
          morningBriefingTimezone: briefingTimezone,
          morningBriefingDays: briefingDays,
          voiceId,
          includeCalendarEvents: includeCalendar,
          includeUnreadEmails: includeEmails,
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
      console.error("[DBG][phone-settings] Error saving:", err);
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Test briefing call
  const handleTestCall = async () => {
    setTestingCall(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/data/app/phone/call/briefing", {
        method: "POST",
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(
          "Test call initiated! You should receive a call shortly.",
        );
      } else {
        setError(data.error || "Failed to initiate test call");
      }
    } catch (err) {
      console.error("[DBG][phone-settings] Error testing call:", err);
      setError("Failed to initiate test call");
    } finally {
      setTestingCall(false);
    }
  };

  // Toggle day selection
  const toggleDay = (day: DayOfWeek) => {
    if (briefingDays.includes(day)) {
      setBriefingDays(briefingDays.filter((d) => d !== day));
    } else {
      setBriefingDays([...briefingDays, day].sort());
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Phone Calling Settings
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Configure AI phone calls and morning briefings.
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
              onClick={() => router.push(`/srv/${expertId}/settings`)}
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
              Phone Calling Settings
            </h1>
          </div>
          <p className="text-[var(--text-muted)] ml-8">
            Configure AI phone calls and morning briefings.
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
        {/* Phone Number Section */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center gap-3 mb-1">
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
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">
              Phone Number
            </h2>
            {config.phoneNumberVerified && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-5 ml-11">
            Add your phone number to receive AI-powered calls.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                Phone Number
              </label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+61 412 345 678"
                  disabled={config.phoneNumberVerified}
                  className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent disabled:bg-gray-50"
                />
                {!config.phoneNumberVerified && (
                  <button
                    onClick={handleSendVerification}
                    disabled={isVerifying || !phoneNumber.trim()}
                    className="px-4 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isVerifying
                      ? "Sending..."
                      : verificationSent
                        ? "Resend Code"
                        : "Verify"}
                  </button>
                )}
              </div>
              <p className="mt-1.5 text-xs text-[var(--text-muted)]">
                Enter your number in international format (e.g., +61 for
                Australia)
              </p>
            </div>

            {verificationSent && !config.phoneNumberVerified && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                  Verification Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  <button
                    onClick={handleConfirmVerification}
                    disabled={isVerifying || verificationCode.length !== 6}
                    className="px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isVerifying ? "Verifying..." : "Confirm"}
                  </button>
                </div>
              </div>
            )}

            {config.phoneNumberVerified && (
              <button
                onClick={() => {
                  setConfig({ ...config, phoneNumberVerified: false });
                  setPhoneNumber("");
                }}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                Change phone number
              </button>
            )}
          </div>
        </div>

        {/* Morning Briefing Section */}
        <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-orange-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Morning Briefing
              </h2>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={briefingEnabled}
                onChange={(e) => setBriefingEnabled(e.target.checked)}
                disabled={!config.phoneNumberVerified}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-primary)]/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)] peer-disabled:opacity-50" />
            </label>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-5 ml-11">
            Receive a daily AI call with your schedule and emails.
          </p>

          {!config.phoneNumberVerified && (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Verify your phone number to enable morning briefings.
            </p>
          )}

          {config.phoneNumberVerified && (
            <div className="space-y-4">
              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                  Briefing Time
                </label>
                <input
                  type="time"
                  value={briefingTime}
                  onChange={(e) => setBriefingTime(e.target.value)}
                  className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                  Timezone
                </label>
                <select
                  value={briefingTimezone}
                  onChange={(e) => setBriefingTimezone(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                >
                  {SUPPORTED_TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Days */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-1.5">
                  Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {([0, 1, 2, 3, 4, 5, 6] as DayOfWeek[]).map((day) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(day)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        briefingDays.includes(day)
                          ? "bg-[var(--color-primary)] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {DAY_NAMES[day].substring(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content Options */}
              <div>
                <label className="block text-sm font-medium text-[var(--text-main)] mb-2">
                  Include in Briefing
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeCalendar}
                      onChange={(e) => setIncludeCalendar(e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--text-main)]">
                      Calendar events
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeEmails}
                      onChange={(e) => setIncludeEmails(e.target.checked)}
                      className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)]"
                    />
                    <span className="text-sm text-[var(--text-main)]">
                      Unread emails summary
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Voice Settings */}
        {config.phoneNumberVerified && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-3 mb-1">
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
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Voice Settings
              </h2>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-5 ml-11">
              Choose the AI voice for your calls.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {VOICE_OPTIONS.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setVoiceId(voice.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-colors ${
                    voiceId === voice.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <p className="font-medium text-[var(--text-main)]">
                    {voice.name}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {voice.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Test Call Section */}
        {config.phoneNumberVerified && (
          <div className="bg-white rounded-xl border border-[var(--color-border)] p-6">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-green-600"
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
              </div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                Test Your Setup
              </h2>
            </div>
            <p className="text-sm text-[var(--text-muted)] mb-4 ml-11">
              Trigger a test briefing call to verify everything works.
            </p>

            <button
              onClick={handleTestCall}
              disabled={testingCall}
              className="ml-11 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testingCall ? (
                <>
                  <LoadingSpinner size="sm" />
                  Calling...
                </>
              ) : (
                <>
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
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  Test Briefing Call
                </>
              )}
            </button>
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`/srv/${expertId}/settings`)}
            className="px-4 py-2.5 text-gray-600 bg-gray-100 rounded-lg font-medium text-sm hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !config.phoneNumberVerified}
            className="px-6 py-2.5 bg-[var(--color-primary)] text-white rounded-lg font-semibold text-sm hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
