"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_TIMEZONES, getTimezoneLabel } from "@/lib/timezones";
import { ImageEditorOverlay } from "@core/components";
import type { ImageEditorData } from "@core/components";

export default function ProfilePage() {
  const { user } = useAuth();

  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [showLogoEditor, setShowLogoEditor] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [logoFeedback, setLogoFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [address, setAddress] = useState("");
  const [timezone, setTimezone] = useState("");
  const [currency, setCurrency] = useState("AUD");
  const [savingName, setSavingName] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [savingTimezone, setSavingTimezone] = useState(false);
  const [savingCurrency, setSavingCurrency] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [addressFeedback, setAddressFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [timezoneFeedback, setTimezoneFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [currencyFeedback, setCurrencyFeedback] = useState<{
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
        if (data.data.logo !== undefined) setLogo(data.data.logo);
        if (data.data.address !== undefined) setAddress(data.data.address);
        if (data.data.timezone) setTimezone(data.data.timezone);
        if (data.data.currency) setCurrency(data.data.currency);
      }
    } catch (err) {
      console.error("[DBG][profile] Failed to fetch preferences:", err);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const savePreference = async (
    payload: Record<string, unknown>,
    setFeedback: (
      fb: { type: "success" | "error"; message: string } | null,
    ) => void,
    successMsg: string,
    failMsg: string,
  ) => {
    try {
      const res = await fetch("/api/data/app/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: successMsg });
      } else {
        setFeedback({ type: "error", message: data.error || failMsg });
      }
    } catch {
      setFeedback({ type: "error", message: failMsg });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleNameBlur = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    setNameFeedback(null);
    await savePreference(
      { name },
      setNameFeedback,
      "Name updated",
      "Failed to update name",
    );
    setSavingName(false);
  };

  const handleLogoSave = async (data: ImageEditorData) => {
    setSavingLogo(true);
    setLogoFeedback(null);
    setShowLogoEditor(false);
    await savePreference(
      { logo: data.imageUrl },
      setLogoFeedback,
      "Logo updated",
      "Failed to update logo",
    );
    setLogo(data.imageUrl);
    setSavingLogo(false);
  };

  const handleLogoRemove = async () => {
    setSavingLogo(true);
    setLogoFeedback(null);
    await savePreference(
      { logo: "" },
      setLogoFeedback,
      "Logo removed",
      "Failed to remove logo",
    );
    setLogo("");
    setSavingLogo(false);
  };

  const handleAddressBlur = async () => {
    setSavingAddress(true);
    setAddressFeedback(null);
    await savePreference(
      { address },
      setAddressFeedback,
      "Address updated",
      "Failed to update address",
    );
    setSavingAddress(false);
  };

  const handleTimezoneChange = async (newTimezone: string) => {
    setTimezone(newTimezone);
    setSavingTimezone(true);
    setTimezoneFeedback(null);
    await savePreference(
      { timezone: newTimezone },
      setTimezoneFeedback,
      "Timezone updated",
      "Failed to update timezone",
    );
    setSavingTimezone(false);
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    setCurrency(newCurrency);
    setSavingCurrency(true);
    setCurrencyFeedback(null);
    await savePreference(
      { currency: newCurrency },
      setCurrencyFeedback,
      "Currency updated",
      "Failed to update currency",
    );
    setSavingCurrency(false);
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
      setPasswordFeedback({ type: "error", message: "Passwords do not match" });
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

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Profile</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your personal information and account settings.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
            Email
          </label>
          <p className="text-[var(--text-body)]">
            {user?.profile?.email || "Not set"}
          </p>
        </div>

        {/* Logo */}
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
            Logo
          </label>
          <p className="text-sm text-[var(--text-muted)] mb-2">
            Displayed on your landing page header.
          </p>
          <div className="flex items-center gap-3">
            {logo ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- tenant logo URL, fixed size */}
                <img
                  src={logo}
                  alt="Logo"
                  className="h-12 w-auto rounded border border-[var(--color-border)] object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setShowLogoEditor(true)}
                  disabled={savingLogo}
                  className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Change
                </button>
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  disabled={savingLogo}
                  className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  Remove
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setShowLogoEditor(true)}
                disabled={savingLogo}
                className="px-3 py-1.5 text-sm border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Upload Logo
              </button>
            )}
            {savingLogo && (
              <span className="text-sm text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            {logoFeedback && (
              <span
                className={`text-sm ${logoFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}
              >
                {logoFeedback.message}
              </span>
            )}
          </div>
        </div>

        {/* Name */}
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
                className={`text-sm ${nameFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}
              >
                {nameFeedback.message}
              </span>
            )}
          </div>
        </div>

        {/* Business Address */}
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
                className={`text-sm ${addressFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}
              >
                {addressFeedback.message}
              </span>
            )}
          </div>
        </div>

        {/* Timezone */}
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
              disabled={savingTimezone}
              className="border border-[var(--color-border)] rounded-lg px-3 py-2 text-[var(--text-main)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
            >
              {!timezone && <option value="">Loading...</option>}
              {SUPPORTED_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {getTimezoneLabel(tz)}
                </option>
              ))}
            </select>
            {savingTimezone && (
              <span className="text-sm text-[var(--text-muted)]">
                Saving...
              </span>
            )}
            {timezoneFeedback && (
              <span
                className={`text-sm ${timezoneFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}
              >
                {timezoneFeedback.message}
              </span>
            )}
          </div>
        </div>

        {/* Currency */}
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
                className={`text-sm ${currencyFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}
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
                  htmlFor="new-password-prof"
                  className="block text-sm font-medium text-[var(--text-body)] mb-1"
                >
                  New Password
                </label>
                <input
                  id="new-password-prof"
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
                className={`text-sm ${passwordFeedback.type === "success" ? "text-green-600" : "text-red-600"}`}
              >
                {passwordFeedback.message}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Logo Editor Overlay */}
      <ImageEditorOverlay
        isOpen={showLogoEditor}
        onClose={() => setShowLogoEditor(false)}
        onSave={handleLogoSave}
        currentImage={logo || undefined}
        title="Upload Logo"
        aspectRatio="1/1"
        defaultSearchQuery="logo icon"
        uploadEndpoint="/api/data/app/tenant/landing-page/upload"
      />
    </div>
  );
}
