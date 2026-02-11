"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_TIMEZONES, getTimezoneLabel } from "@/lib/timezones";

/**
 * User preferences/settings page
 */
export default function PreferencesPage() {
  const params = useParams();
  const _expertId = params.expertId as string;
  const { user, logout } = useAuth();

  const [timezone, setTimezone] = useState("");
  const [videoCallPreference, setVideoCallPreference] = useState<
    "cally" | "google_meet" | "zoom"
  >("cally");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [emailDisplayName, setEmailDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [videoFeedback, setVideoFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/preferences");
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.timezone) setTimezone(data.data.timezone);
        if (data.data.emailDisplayName !== undefined)
          setEmailDisplayName(data.data.emailDisplayName);
        if (data.data.videoCallPreference)
          setVideoCallPreference(data.data.videoCallPreference);
        setGoogleCalendarConnected(!!data.data.googleCalendarConnected);
        setZoomConnected(!!data.data.zoomConnected);
      }
    } catch (err) {
      console.error("[DBG][preferences] Failed to fetch preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const handleEmailDisplayNameBlur = async () => {
    setSavingEmail(true);
    setEmailFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailDisplayName }),
      });
      const data = await res.json();
      if (data.success) {
        setEmailFeedback({
          type: "success",
          message: "Email display name updated",
        });
      } else {
        setEmailFeedback({
          type: "error",
          message: data.error || "Failed to update email display name",
        });
      }
    } catch {
      setEmailFeedback({
        type: "error",
        message: "Failed to update email display name",
      });
    } finally {
      setSavingEmail(false);
      setTimeout(() => setEmailFeedback(null), 3000);
    }
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    setSaving(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timezone: newTimezone }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "Timezone updated" });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to update timezone",
        });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to update timezone" });
    } finally {
      setSaving(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleVideoCallPreferenceChange = async (
    newPref: "cally" | "google_meet" | "zoom",
  ) => {
    if (newPref === videoCallPreference) return;
    setVideoCallPreference(newPref);
    setSavingVideo(true);
    setVideoFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoCallPreference: newPref }),
      });
      const data = await res.json();
      if (data.success) {
        setVideoFeedback({
          type: "success",
          message: "Video preference updated",
        });
      } else {
        setVideoFeedback({
          type: "error",
          message: data.error || "Failed to update video preference",
        });
        // Revert on failure
        setVideoCallPreference(videoCallPreference);
      }
    } catch {
      setVideoFeedback({
        type: "error",
        message: "Failed to update video preference",
      });
      setVideoCallPreference(videoCallPreference);
    } finally {
      setSavingVideo(false);
      setTimeout(() => setVideoFeedback(null), 3000);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Settings</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your account preferences.
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Email
            </label>
            <p className="text-[var(--text-body)]">
              {user?.profile?.email || "Not set"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Name
            </label>
            <p className="text-[var(--text-body)]">
              {user?.profile?.name || "Not set"}
            </p>
          </div>
        </div>
      </div>

      {/* Email Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Email
        </h2>
        <div>
          <label
            htmlFor="email-display-name"
            className="block text-sm font-medium text-[var(--text-muted)] mb-1"
          >
            Sender Display Name
          </label>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            This name appears as the sender on all outgoing emails.
          </p>
          <div className="flex items-center gap-3">
            <input
              id="email-display-name"
              type="text"
              value={emailDisplayName}
              onChange={(e) => setEmailDisplayName(e.target.value)}
              onBlur={handleEmailDisplayNameBlur}
              placeholder={user?.profile?.name || "Your name"}
              maxLength={100}
              disabled={savingEmail}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 w-72"
            />
            {savingEmail && (
              <span className="text-sm text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            {emailFeedback && (
              <span
                className={`text-sm ${
                  emailFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {emailFeedback.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Regional Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Regional
        </h2>
        <div>
          <label
            htmlFor="timezone-select"
            className="block text-sm font-medium text-[var(--text-muted)] mb-1"
          >
            Timezone
          </label>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Used for meeting times, booking slots, and notifications.
          </p>
          <div className="flex items-center gap-3">
            <select
              id="timezone-select"
              value={timezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              disabled={saving}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {!timezone && <option value="">Loading...</option>}
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {getTimezoneLabel(tz)}
                </option>
              ))}
            </select>
            {saving && (
              <span className="text-sm text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            {feedback && (
              <span
                className={`text-sm ${
                  feedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {feedback.message}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Video Calls Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-1">
          Video Calls
        </h2>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Choose the video conferencing provider for new events.
        </p>
        <div className="space-y-3">
          {/* Cally Video option */}
          <button
            type="button"
            onClick={() => handleVideoCallPreferenceChange("cally")}
            disabled={savingVideo}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              videoCallPreference === "cally"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] hover:border-gray-300"
            } disabled:opacity-50`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  videoCallPreference === "cally"
                    ? "border-[var(--color-primary)]"
                    : "border-gray-300"
                }`}
              >
                {videoCallPreference === "cally" && (
                  <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--text-main)]">
                  Cally Video
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  Built-in video conferencing powered by Cally
                </p>
              </div>
            </div>
          </button>

          {/* Google Meet option */}
          <button
            type="button"
            onClick={() => handleVideoCallPreferenceChange("google_meet")}
            disabled={savingVideo || !googleCalendarConnected}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              videoCallPreference === "google_meet"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] hover:border-gray-300"
            } disabled:opacity-50`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  videoCallPreference === "google_meet"
                    ? "border-[var(--color-primary)]"
                    : "border-gray-300"
                }`}
              >
                {videoCallPreference === "google_meet" && (
                  <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--text-main)]">
                  Google Meet
                </p>
                <p className="text-sm text-[var(--text-muted)]">
                  {googleCalendarConnected
                    ? "Generate Google Meet links for events"
                    : "Connect Google Calendar in Integrations to enable"}
                </p>
              </div>
            </div>
          </button>

          {/* Zoom option */}
          <button
            type="button"
            onClick={() => handleVideoCallPreferenceChange("zoom")}
            disabled={savingVideo || !zoomConnected}
            className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
              videoCallPreference === "zoom"
                ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                : "border-[var(--color-border)] hover:border-gray-300"
            } disabled:opacity-50`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  videoCallPreference === "zoom"
                    ? "border-[var(--color-primary)]"
                    : "border-gray-300"
                }`}
              >
                {videoCallPreference === "zoom" && (
                  <div className="w-3 h-3 rounded-full bg-[var(--color-primary)]" />
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--text-main)]">Zoom</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {zoomConnected
                    ? "Generate Zoom meeting links for events"
                    : "Connect Zoom in Integrations to enable"}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Video feedback */}
        <div className="mt-3 h-5">
          {savingVideo && (
            <span className="text-sm text-[var(--text-muted)]">Saving...</span>
          )}
          {videoFeedback && (
            <span
              className={`text-sm ${
                videoFeedback.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {videoFeedback.message}
            </span>
          )}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[var(--text-main)]">Sign Out</p>
            <p className="text-sm text-[var(--text-muted)]">
              Sign out of your account on this device.
            </p>
          </div>
          <button
            onClick={() => logout("/")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
