"use client";

import { PrimaryButton, SecondaryButton } from "@/components/Button";
import type { EmailConfig, TenantDnsRecord } from "@/types";
import { useState } from "react";
import DnsRecordStatus from "./DnsRecordStatus";
import DomainStatusBadge from "./DomainStatusBadge";

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
}

export default function EmailSetupCard({
  domain,
  emailConfig,
  onSetupEmail,
  onVerifyEmail,
  onDisableEmail,
  dnsRecords = [],
}: EmailSetupCardProps) {
  const [emailPrefix, setEmailPrefix] = useState("hello");
  const [forwardToEmail, setForwardToEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forwardToCal, setForwardToCal] = useState(
    emailConfig?.forwardToCal ?? true,
  );
  const [togglingCal, setTogglingCal] = useState(false);

  const hasEmail = !!emailConfig?.domainEmail;
  const isEmailVerified = emailConfig?.sesVerificationStatus === "verified";

  const handleSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSetupEmail(emailPrefix, forwardToEmail, forwardToCal);
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
                className="w-32 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="hello"
              />
              <span className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-gray-600">
                @{domain}
              </span>
            </div>
          </div>

          {/* Forward to Cal checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forwardToCal}
              onChange={() => setForwardToCal(!forwardToCal)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
            />
            <div>
              <span className="text-sm font-medium text-gray-900">
                Auto-forward emails to Cal
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                Emails sent to {emailPrefix}@{domain} will also appear in the AI
                Assistant inbox, so Cal can gather information from them.
              </p>
            </div>
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Forward emails to
            </label>
            <input
              type="email"
              value={forwardToEmail}
              onChange={(e) => setForwardToEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="your@email.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              Emails sent to {emailPrefix}@{domain} will be forwarded to this
              address.
            </p>
          </div>

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
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {emailConfig.domainEmail}
              </p>
              <p className="text-xs text-gray-500">
                Forwards to: {emailConfig.forwardToEmail}
              </p>
            </div>
          </div>
        </div>

        {/* Forward to Cal toggle */}
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
              Auto-forward emails to Cal
            </span>
            <p className="text-xs text-gray-500 mt-0.5">
              Emails sent to {emailConfig.domainEmail} will also appear in the
              AI Assistant inbox, so Cal can gather information from them.
            </p>
          </div>
        </label>

        {!isEmailVerified && dnsRecords.length > 0 && (
          <DnsRecordStatus
            records={dnsRecords}
            mxVerified={emailConfig.mxVerified}
            spfVerified={emailConfig.spfVerified ?? false}
            dkimVerified={emailConfig.dkimVerified}
          />
        )}

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          {!isEmailVerified && (
            <PrimaryButton onClick={handleVerify} loading={verifying}>
              Check Verification
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
