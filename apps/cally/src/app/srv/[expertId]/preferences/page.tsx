"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_TIMEZONES, getTimezoneLabel } from "@/lib/timezones";
import type { WeeklySchedule } from "@/types/booking";
import { DEFAULT_BOOKING_CONFIG } from "@/types/booking";

/**
 * User preferences/settings page
 */
export default function PreferencesPage() {
  const params = useParams();
  const _expertId = params.expertId as string;
  const { user, logout } = useAuth();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("");
  const [videoCallPreference, setVideoCallPreference] = useState<
    "cally" | "google_meet" | "zoom"
  >("cally");
  const [googleCalendarConnected, setGoogleCalendarConnected] = useState(false);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [defaultEventDuration, setDefaultEventDuration] = useState(30);
  const [currency, setCurrency] = useState("AUD");
  const [savingName, setSavingName] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [savingDuration, setSavingDuration] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [addressFeedback, setAddressFeedback] = useState<{
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
  const [durationFeedback, setDurationFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currencyFeedback, setCurrencyFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule>(
    DEFAULT_BOOKING_CONFIG.weeklySchedule,
  );
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [scheduleFeedback, setScheduleFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/preferences");
      const data = await res.json();
      if (data.success && data.data) {
        if (data.data.name) setName(data.data.name);
        if (data.data.address !== undefined) setAddress(data.data.address);
        if (data.data.timezone) setTimezone(data.data.timezone);
        if (data.data.videoCallPreference)
          setVideoCallPreference(data.data.videoCallPreference);
        if (data.data.defaultEventDuration)
          setDefaultEventDuration(data.data.defaultEventDuration);
        if (data.data.currency) setCurrency(data.data.currency);
        if (data.data.weeklySchedule)
          setWeeklySchedule(data.data.weeklySchedule);
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

  const handleNameBlur = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    setNameFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setNameFeedback({ type: "success", message: "Name updated" });
      } else {
        setNameFeedback({
          type: "error",
          message: data.error || "Failed to update name",
        });
      }
    } catch {
      setNameFeedback({ type: "error", message: "Failed to update name" });
    } finally {
      setSavingName(false);
      setTimeout(() => setNameFeedback(null), 3000);
    }
  };

  const handleAddressBlur = async () => {
    setSavingAddress(true);
    setAddressFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = await res.json();
      if (data.success) {
        setAddressFeedback({ type: "success", message: "Address updated" });
      } else {
        setAddressFeedback({
          type: "error",
          message: data.error || "Failed to update address",
        });
      }
    } catch {
      setAddressFeedback({
        type: "error",
        message: "Failed to update address",
      });
    } finally {
      setSavingAddress(false);
      setTimeout(() => setAddressFeedback(null), 3000);
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

  const handleDurationBlur = async () => {
    const duration = Number(defaultEventDuration);
    if (!Number.isInteger(duration) || duration < 5 || duration > 480) {
      setDurationFeedback({
        type: "error",
        message: "Must be a whole number between 5 and 480",
      });
      setTimeout(() => setDurationFeedback(null), 3000);
      return;
    }

    setSavingDuration(true);
    setDurationFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultEventDuration: duration }),
      });
      const data = await res.json();
      if (data.success) {
        setDurationFeedback({
          type: "success",
          message: "Default duration updated",
        });
      } else {
        setDurationFeedback({
          type: "error",
          message: data.error || "Failed to update default duration",
        });
      }
    } catch {
      setDurationFeedback({
        type: "error",
        message: "Failed to update default duration",
      });
    } finally {
      setSavingDuration(false);
      setTimeout(() => setDurationFeedback(null), 3000);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    setSavingCurrency(true);
    setCurrencyFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency: newCurrency }),
      });
      const data = await res.json();
      if (data.success) {
        setCurrencyFeedback({ type: "success", message: "Currency updated" });
      } else {
        setCurrencyFeedback({
          type: "error",
          message: data.error || "Failed to update currency",
        });
      }
    } catch {
      setCurrencyFeedback({
        type: "error",
        message: "Failed to update currency",
      });
    } finally {
      setSavingCurrency(false);
      setTimeout(() => setCurrencyFeedback(null), 3000);
    }
  };

  const saveSchedule = async (updated: WeeklySchedule) => {
    setSavingSchedule(true);
    setScheduleFeedback(null);

    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weeklySchedule: updated }),
      });
      const data = await res.json();
      if (data.success) {
        setScheduleFeedback({
          type: "success",
          message: "Working hours updated",
        });
      } else {
        setScheduleFeedback({
          type: "error",
          message: data.error || "Failed to update working hours",
        });
        // Revert on failure
        setWeeklySchedule(weeklySchedule);
      }
    } catch {
      setScheduleFeedback({
        type: "error",
        message: "Failed to update working hours",
      });
      setWeeklySchedule(weeklySchedule);
    } finally {
      setSavingSchedule(false);
      setTimeout(() => setScheduleFeedback(null), 3000);
    }
  };

  const handleDayToggle = (day: number) => {
    // Prevent disabling the last enabled day
    const enabledCount = Object.values(weeklySchedule).filter(
      (d) => d.enabled,
    ).length;
    if (weeklySchedule[day].enabled && enabledCount <= 1) return;

    const updated = {
      ...weeklySchedule,
      [day]: { ...weeklySchedule[day], enabled: !weeklySchedule[day].enabled },
    };
    setWeeklySchedule(updated);
    saveSchedule(updated);
  };

  const handleHourChange = (
    day: number,
    field: "startHour" | "endHour",
    value: number,
  ) => {
    const entry = weeklySchedule[day];
    const newStart = field === "startHour" ? value : entry.startHour;
    const newEnd = field === "endHour" ? value : entry.endHour;

    // Ensure endHour > startHour
    if (newEnd <= newStart) return;

    const updated = {
      ...weeklySchedule,
      [day]: { ...entry, [field]: value },
    };
    setWeeklySchedule(updated);
    saveSchedule(updated);
  };

  const handleChangePassword = async () => {
    setPasswordFeedback(null);

    if (!currentPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Current password is required",
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordFeedback({
        type: "error",
        message: "New password must be at least 8 characters",
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordFeedback({
        type: "error",
        message: "Passwords do not match",
      });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await fetch("/api/auth/cognito/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setPasswordFeedback({
          type: "success",
          message: "Password changed successfully",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmNewPassword("");
        setShowChangePassword(false);
      } else {
        setPasswordFeedback({
          type: "error",
          message: data.message || "Failed to change password",
        });
      }
    } catch {
      setPasswordFeedback({
        type: "error",
        message: "Failed to change password",
      });
    } finally {
      setSavingPassword(false);
      setTimeout(() => setPasswordFeedback(null), 5000);
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
            <label
              htmlFor="name-input"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Name
            </label>
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Used as the sender name on all outgoing emails.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameBlur}
                placeholder="Your name"
                maxLength={100}
                disabled={savingName}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 w-72"
              />
              {savingName && (
                <span className="text-sm text-[var(--text-muted)]">
                  Saving...
                </span>
              )}
              {nameFeedback && (
                <span
                  className={`text-sm ${
                    nameFeedback.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {nameFeedback.message}
                </span>
              )}
            </div>
          </div>
          <div>
            <label
              htmlFor="address-input"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Business Address
            </label>
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Displayed on your landing page location section.
            </p>
            <div className="flex items-center gap-3">
              <input
                id="address-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onBlur={handleAddressBlur}
                placeholder="e.g. 123 Main St, Sydney NSW 2000"
                maxLength={300}
                disabled={savingAddress}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 w-96"
              />
              {savingAddress && (
                <span className="text-sm text-[var(--text-muted)]">
                  Saving...
                </span>
              )}
              {addressFeedback && (
                <span
                  className={`text-sm ${
                    addressFeedback.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {addressFeedback.message}
                </span>
              )}
            </div>
          </div>
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
          <div>
            <label
              htmlFor="currency-select"
              className="block text-sm font-medium text-[var(--text-muted)] mb-1"
            >
              Currency
            </label>
            <p className="text-sm text-[var(--text-muted)] mb-2">
              Used for product pricing on your landing page.
            </p>
            <div className="flex items-center gap-3">
              <select
                id="currency-select"
                value={currency}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={savingCurrency}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
              >
                <option value="AUD">AUD - Australian Dollar</option>
                <option value="USD">USD - US Dollar</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="EUR">EUR - Euro</option>
                <option value="INR">INR - Indian Rupee</option>
                <option value="NZD">NZD - New Zealand Dollar</option>
                <option value="CAD">CAD - Canadian Dollar</option>
                <option value="SGD">SGD - Singapore Dollar</option>
              </select>
              {savingCurrency && (
                <span className="text-sm text-[var(--text-muted)]">
                  Saving...
                </span>
              )}
              {currencyFeedback && (
                <span
                  className={`text-sm ${
                    currencyFeedback.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {currencyFeedback.message}
                </span>
              )}
            </div>
          </div>
          {/* Change Password */}
          <div className="pt-4 border-t border-[var(--color-border)]">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)]">
                  Password
                </label>
                <p className="text-sm text-[var(--text-muted)]">
                  Change your account password.
                </p>
              </div>
              {!showChangePassword && (
                <button
                  type="button"
                  onClick={() => setShowChangePassword(true)}
                  className="text-sm text-[var(--color-primary)] hover:underline"
                >
                  Change Password
                </button>
              )}
            </div>
            {showChangePassword && (
              <div className="mt-3 space-y-3 max-w-sm">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-sm font-medium text-[var(--text-body)] mb-1"
                  >
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    disabled={savingPassword}
                    autoComplete="current-password"
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password-pref"
                    className="block text-sm font-medium text-[var(--text-body)] mb-1"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password-pref"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    disabled={savingPassword}
                    autoComplete="new-password"
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-new-password"
                    className="block text-sm font-medium text-[var(--text-body)] mb-1"
                  >
                    Confirm New Password
                  </label>
                  <input
                    id="confirm-new-password"
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    disabled={savingPassword}
                    autoComplete="new-password"
                    className="w-full border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={savingPassword}
                    className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    {savingPassword ? "Changing..." : "Change Password"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmNewPassword("");
                      setPasswordFeedback(null);
                    }}
                    disabled={savingPassword}
                    className="px-4 py-2 text-[var(--text-muted)] text-sm hover:text-[var(--text-body)]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {passwordFeedback && (
              <div className="mt-2">
                <span
                  className={`text-sm ${
                    passwordFeedback.type === "success"
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {passwordFeedback.message}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Calendar
        </h2>
        <div>
          <label
            htmlFor="duration-input"
            className="block text-sm font-medium text-[var(--text-muted)] mb-1"
          >
            Default Event Duration
          </label>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Used when creating new events on the calendar.
          </p>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                id="duration-input"
                type="number"
                min={5}
                max={480}
                step={1}
                value={defaultEventDuration}
                onChange={(e) =>
                  setDefaultEventDuration(Number(e.target.value))
                }
                onBlur={handleDurationBlur}
                disabled={savingDuration}
                className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 w-24"
              />
              <span className="text-sm text-[var(--text-muted)]">minutes</span>
            </div>
            {savingDuration && (
              <span className="text-sm text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            {durationFeedback && (
              <span
                className={`text-sm ${
                  durationFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {durationFeedback.message}
              </span>
            )}
          </div>
        </div>

        {/* Working Hours */}
        <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
            Working Hours
          </label>
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Set which days and hours you are available for bookings.
          </p>
          <div className="space-y-2">
            {(
              [
                [1, "Mon"],
                [2, "Tue"],
                [3, "Wed"],
                [4, "Thu"],
                [5, "Fri"],
                [6, "Sat"],
                [0, "Sun"],
              ] as [number, string][]
            ).map(([day, label]) => {
              const entry = weeklySchedule[day];
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-10 text-sm font-medium text-[var(--text-main)]">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDayToggle(day)}
                    disabled={savingSchedule}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50 ${
                      entry.enabled
                        ? "bg-[var(--color-primary)]"
                        : "bg-gray-200"
                    }`}
                    aria-label={`Toggle ${label}`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        entry.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                  {entry.enabled ? (
                    <>
                      <select
                        value={entry.startHour}
                        onChange={(e) =>
                          handleHourChange(
                            day,
                            "startHour",
                            Number(e.target.value),
                          )
                        }
                        disabled={savingSchedule}
                        className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                      >
                        {Array.from({ length: 17 }, (_, i) => i + 6).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h === 0
                                ? "12:00 AM"
                                : h < 12
                                  ? `${h}:00 AM`
                                  : h === 12
                                    ? "12:00 PM"
                                    : `${h - 12}:00 PM`}
                            </option>
                          ),
                        )}
                      </select>
                      <span className="text-sm text-[var(--text-muted)]">
                        to
                      </span>
                      <select
                        value={entry.endHour}
                        onChange={(e) =>
                          handleHourChange(
                            day,
                            "endHour",
                            Number(e.target.value),
                          )
                        }
                        disabled={savingSchedule}
                        className="border border-[var(--color-border)] rounded-lg px-2 py-1 text-sm text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                      >
                        {Array.from({ length: 17 }, (_, i) => i + 6).map(
                          (h) => (
                            <option key={h} value={h}>
                              {h === 0
                                ? "12:00 AM"
                                : h < 12
                                  ? `${h}:00 AM`
                                  : h === 12
                                    ? "12:00 PM"
                                    : `${h - 12}:00 PM`}
                            </option>
                          ),
                        )}
                      </select>
                    </>
                  ) : (
                    <span className="text-sm text-[var(--text-muted)]">
                      Unavailable
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 h-5">
            {savingSchedule && (
              <span className="text-sm text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            {scheduleFeedback && (
              <span
                className={`text-sm ${
                  scheduleFeedback.type === "success"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {scheduleFeedback.message}
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
