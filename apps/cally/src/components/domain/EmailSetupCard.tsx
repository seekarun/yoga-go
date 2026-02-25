"use client";

import { PrimaryButton, SecondaryButton } from "@/components/Button";
import type { EmailConfig, TenantDnsRecord } from "@/types";
import { useState, useEffect, useRef, useCallback } from "react";
import DomainStatusBadge from "./DomainStatusBadge";
import DnsInstructions from "./DnsInstructions";

interface EmailSetupCardProps {
  domain: string;
  emailConfig?: EmailConfig;
  onSetupEmail: (
    emailPrefix: string,
    forwardToEmail: string,
    forwardToCal: boolean,
  ) => Promise<void>;
  onVerifyEmail: () => Promise<void>;
  onDisableEmail: () => Promise<void>;
  dnsRecords?: TenantDnsRecord[];
  defaultForwardEmail?: string;
  dnsManagement?: "vercel" | "self";
}

export default function EmailSetupCard({
  domain,
  emailConfig,
  onSetupEmail,
  onVerifyEmail,
  onDisableEmail,
  dnsRecords = [],
  defaultForwardEmail = "",
  dnsManagement = "vercel",
}: EmailSetupCardProps) {
  const [emailPrefix, setEmailPrefix] = useState("hello");
  const [forwardToEmail, setForwardToEmail] = useState(defaultForwardEmail);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forwardingEnabled, setForwardingEnabled] = useState(true);
  const [forwardToCal, setForwardToCal] = useState(
    emailConfig?.forwardToCal ?? true,
  );
  const [togglingCal, setTogglingCal] = useState(false);
  const [showDnsDetails, setShowDnsDetails] = useState(false);
  const [editingForward, setEditingForward] = useState(false);
  const [editForwardEmail, setEditForwardEmail] = useState(
    emailConfig?.forwardToEmail || "",
  );
  const [savingForward, setSavingForward] = useState(false);

  const hasEmail = !!emailConfig?.domainEmail;
  const isEmailVerified = emailConfig?.sesVerificationStatus === "verified";

  // Auto-poll verification with expanding intervals: 10s, 20s, 40s, 60s (cap)
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef(10_000);
  const POLL_MAX_INTERVAL = 60_000;

  const pollVerification = useCallback(async () => {
    try {
      await onVerifyEmail();
    } catch {
      // Silently continue polling on error
    }
    // Schedule next poll with expanding interval
    pollIntervalRef.current = Math.min(
      pollIntervalRef.current * 2,
      POLL_MAX_INTERVAL,
    );
    pollTimerRef.current = setTimeout(
      pollVerification,
      pollIntervalRef.current,
    );
  }, [onVerifyEmail]);

  useEffect(() => {
    if (hasEmail && !isEmailVerified) {
      pollIntervalRef.current = 10_000;
      pollTimerRef.current = setTimeout(
        pollVerification,
        pollIntervalRef.current,
      );
    }
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
      }
    };
  }, [hasEmail, isEmailVerified, pollVerification]);

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSetupEmail(
        emailPrefix,
        forwardingEnabled ? forwardToEmail : "",
        forwardToCal,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to setup email");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError(null);
    try {
      await onVerifyEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (
      !confirm(
        "Are you sure you want to disable email? You will need to re-configure DNS records to enable it again.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onDisableEmail();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable email");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleForwardToCal = async () => {
    setTogglingCal(true);
    setError(null);
    const newValue = !forwardToCal;
    try {
      const response = await fetch(
        "/api/data/app/domain/email/forward-to-cal",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ forwardToCal: newValue }),
        },
      );
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update setting");
      }
      setForwardToCal(newValue);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setTogglingCal(false);
    }
  };

  const handleSaveForwarding = async (email: string, enabled: boolean) => {
    setSavingForward(true);
    setError(null);
    try {
      const response = await fetch("/api/data/app/domain/email/forwarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forwardToEmail: email,
          forwardingEnabled: enabled,
        }),
      });
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "Failed to update forwarding");
      }
      setEditingForward(false);
      // Trigger a refresh by calling onVerifyEmail (which re-fetches status)
      await onVerifyEmail();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update forwarding",
      );
    } finally {
      setSavingForward(false);
    }
  };

  // State: No email configured
  if (!hasEmail) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Email Setup</h3>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          Set up a custom email address for your domain to receive appointment
          notifications and communicate with clients.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={emailPrefix}
                onChange={(e) => setEmailPrefix(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-right"
                placeholder="hello"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                @{domain}
              </span>
            </div>
          </div>

          {/* Assistant feature toggle */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forwardToCal}
              onChange={() => setForwardToCal(!forwardToCal)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Assistant feature enabled
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Allow AI to collect and process data from emails sent to{" "}
                {emailPrefix}@{domain}.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forwardingEnabled}
              onChange={() => setForwardingEnabled(!forwardingEnabled)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Forward emails to my personal email
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Receive a copy of emails sent to {emailPrefix}@{domain} in your
                inbox.
              </p>
            </div>
          </label>

          {forwardingEnabled && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forward to
              </label>
              <input
                type="email"
                value={forwardToEmail}
                onChange={(e) => setForwardToEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="your@email.com"
              />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <PrimaryButton onClick={handleSetup} loading={loading} fullWidth>
            Enable Email
          </PrimaryButton>
        </div>
      </div>
    );
  }

  // State: Email configured
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <h3 className="text-lg font-semibold text-gray-900">Email</h3>
        </div>
        <DomainStatusBadge
          verified={isEmailVerified}
          pending={!isEmailVerified}
          label={isEmailVerified ? "Active" : "Pending Verification"}
        />
      </div>

      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm font-medium text-gray-900">
            {emailConfig.domainEmail}
          </p>
          {!editingForward ? (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-gray-500">
                {emailConfig.forwardingEnabled !== false
                  ? `Forwards to: ${emailConfig.forwardToEmail}`
                  : "Forwarding disabled"}
              </p>
              <button
                onClick={() => {
                  setEditForwardEmail(emailConfig.forwardToEmail || "");
                  setEditingForward(true);
                }}
                className="text-xs text-[var(--color-primary)] hover:underline font-medium"
              >
                Edit
              </button>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Forward emails to
                </label>
                <input
                  type="email"
                  value={editForwardEmail}
                  onChange={(e) => setEditForwardEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="your@email.com"
                />
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <button
                  onClick={() => handleSaveForwarding(editForwardEmail, true)}
                  disabled={savingForward}
                  className="text-[var(--color-primary)] hover:underline disabled:opacity-50"
                >
                  {savingForward ? "Saving..." : "Save"}
                </button>
                {emailConfig.forwardingEnabled !== false && (
                  <button
                    onClick={() =>
                      handleSaveForwarding(emailConfig.forwardToEmail, false)
                    }
                    disabled={savingForward}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    Stop Forwarding
                  </button>
                )}
                <button
                  onClick={() => setEditingForward(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Assistant feature toggle */}
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={forwardToCal}
            onChange={handleToggleForwardToCal}
            disabled={togglingCal}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
          />
          <div>
            <span className="text-sm font-medium text-gray-900">
              Assistant feature enabled
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Allow AI to collect and process data from emails sent to{" "}
              {emailConfig.domainEmail}.
            </p>
          </div>
        </label>

        {!isEmailVerified && (
          <>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg
                className="w-4 h-4 animate-spin text-yellow-600"
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <span>Verifying DNS records... this may take a few minutes.</span>
              {dnsRecords.length > 0 && dnsManagement !== "self" && (
                <button
                  onClick={() => setShowDnsDetails(true)}
                  className="text-[var(--color-primary)] hover:underline text-xs font-medium"
                >
                  Details
                </button>
              )}
            </div>

            {/* For self-managed domains, always show email DNS records prominently */}
            {dnsManagement === "self" && dnsRecords.length > 0 && (
              <DnsInstructions
                records={dnsRecords}
                title="Email DNS Records"
                description="Add these records at your domain registrar to enable email:"
              />
            )}
          </>
        )}

        {/* DNS Details Modal */}
        {showDnsDetails && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            onClick={() => setShowDnsDetails(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  DNS Records Status
                </h3>
                <button
                  onClick={() => setShowDnsDetails(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="p-4 space-y-3">
                {dnsRecords.map((record, index) => {
                  const isVerified =
                    (record.type === "MX" && emailConfig.mxVerified) ||
                    (record.type === "TXT" &&
                      record.value.includes("spf") &&
                      (emailConfig.spfVerified ?? false)) ||
                    (record.type === "CNAME" &&
                      record.name.includes("._domainkey") &&
                      emailConfig.dkimVerified);
                  return (
                    <div
                      key={index}
                      className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 text-xs font-mono font-semibold bg-gray-200 text-gray-700 rounded">
                              {record.type}
                            </span>
                            <span className="text-sm font-medium text-gray-900 truncate">
                              {record.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 break-all">
                            {record.value}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {record.purpose}
                          </p>
                        </div>
                        <DomainStatusBadge
                          verified={!!isVerified}
                          pending={!isVerified}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {!isEmailVerified && (
            <PrimaryButton onClick={handleVerify} loading={verifying}>
              Check Status Now
            </PrimaryButton>
          )}
          <SecondaryButton onClick={handleDisable} loading={loading}>
            Disable Email
          </SecondaryButton>
        </div>
      </div>
    </div>
  );
}
