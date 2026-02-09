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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/preferences");
      const data = await res.json();
      if (data.success && data.data?.timezone) {
        setTimezone(data.data.timezone);
      }
    } catch (err) {
      console.error("[DBG][preferences] Failed to fetch preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

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
