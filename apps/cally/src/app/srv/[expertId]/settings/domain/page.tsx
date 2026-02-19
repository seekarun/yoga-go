"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DomainSetupCard, DomainSearchCard } from "@/components/domain";
import LoadingSpinner from "@/components/LoadingSpinner";
import type {
  DomainConfig,
  EmailConfig,
  DomainStatusResponse,
  TenantDnsRecord,
  EmailSignatureConfig,
} from "@/types";

type DomainTab = "search" | "byod";

/**
 * Generate DNS records for email setup (client-side version)
 */
function generateEmailDnsRecords(
  domain: string,
  dkimTokens: string[],
): TenantDnsRecord[] {
  const records: TenantDnsRecord[] = [];
  const SES_REGION = "us-west-2";

  // MX Record
  records.push({
    type: "MX",
    name: "@",
    value: `inbound-smtp.${SES_REGION}.amazonaws.com`,
    priority: 10,
    purpose: "Email receiving - Routes incoming emails to AWS SES",
  });

  // SPF TXT Record
  records.push({
    type: "TXT",
    name: "@",
    value: "v=spf1 include:amazonses.com ~all",
    purpose:
      "SPF - Authorizes Amazon SES to send emails on behalf of your domain",
  });

  // DKIM CNAME Records
  dkimTokens.forEach((token, index) => {
    records.push({
      type: "CNAME",
      name: `${token}._domainkey`,
      value: `${token}.dkim.amazonses.com`,
      purpose: `DKIM ${index + 1} - Email authentication signature`,
    });
  });

  // Suppress unused warning
  void domain;

  return records;
}

/**
 * Domain & Email settings page
 */
export default function DomainSettingsPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [domainConfig, setDomainConfig] = useState<DomainConfig | undefined>();
  const [additionalDomains, setAdditionalDomains] = useState<DomainConfig[]>(
    [],
  );
  const [emailConfig, setEmailConfig] = useState<EmailConfig | undefined>();
  const [emailDnsRecords, setEmailDnsRecords] = useState<TenantDnsRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DomainTab>("search");
  const [signature, setSignature] = useState<EmailSignatureConfig>({
    text: "",
    html: "",
    enabled: false,
  });
  const [sigSaving, setSigSaving] = useState(false);
  const [sigMessage, setSigMessage] = useState<string | null>(null);

  // Fetch domain status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/data/app/domain/status");
      const data = await response.json();

      if (data.success) {
        const statusData = data.data as DomainStatusResponse;
        setDomainConfig(statusData.domainConfig);
        setAdditionalDomains(statusData.additionalDomains || []);
        setEmailConfig(statusData.emailConfig);

        // Generate DNS records if email is configured
        if (
          statusData.emailConfig?.sesDkimTokens &&
          statusData.domainConfig?.domain
        ) {
          const records = generateEmailDnsRecords(
            statusData.domainConfig.domain,
            statusData.emailConfig.sesDkimTokens,
          );
          setEmailDnsRecords(records);
        }
      } else {
        setError(data.error || "Failed to load domain status");
      }

      // Fetch signature config
      try {
        const sigRes = await fetch("/api/data/app/inbox/signature");
        const sigData = await sigRes.json();
        if (sigData.success && sigData.data) {
          setSignature(sigData.data);
        }
      } catch {
        // Signature fetch failed, use defaults
      }
    } catch (err) {
      console.error("[DBG][DomainSettingsPage] Error fetching status:", err);
      setError("Failed to load domain status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Add domain
  const handleAddDomain = async (
    domain: string,
  ): Promise<{ nameservers: string[] }> => {
    const response = await fetch("/api/data/app/domain/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ domain }),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to add domain");
    }

    await fetchStatus();
    return { nameservers: data.data.nameservers };
  };

  // Verify domain (optionally specify which domain to verify)
  const handleVerifyDomain = async (
    targetDomain?: string,
  ): Promise<{ verified: boolean }> => {
    const response = await fetch("/api/data/app/domain/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(targetDomain ? { domain: targetDomain } : {}),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Verification failed");
    }

    await fetchStatus();
    return { verified: data.data.verified };
  };

  // Remove domain (optionally specify which domain to remove)
  const handleRemoveDomain = async (targetDomain?: string): Promise<void> => {
    const response = await fetch("/api/data/app/domain/remove", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(targetDomain ? { domain: targetDomain } : {}),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to remove domain");
    }

    // Refresh state from server to get updated domain lists
    await fetchStatus();
  };

  // Setup email
  const handleSetupEmail = async (
    emailPrefix: string,
    forwardToEmail: string,
    forwardToCal: boolean,
  ): Promise<void> => {
    const response = await fetch("/api/data/app/domain/email/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailPrefix, forwardToEmail, forwardToCal }),
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to setup email");
    }

    await fetchStatus();
  };

  // Verify email
  const handleVerifyEmail = async (): Promise<void> => {
    const response = await fetch("/api/data/app/domain/email/verify");
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Verification failed");
    }

    await fetchStatus();
  };

  // Disable email
  const handleDisableEmail = async (): Promise<void> => {
    const response = await fetch("/api/data/app/domain/email/disable", {
      method: "DELETE",
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to disable email");
    }

    setEmailConfig(undefined);
    setEmailDnsRecords([]);
  };

  const handleSaveSignature = async () => {
    setSigSaving(true);
    setSigMessage(null);
    try {
      const res = await fetch("/api/data/app/inbox/signature", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(signature),
      });
      const data = await res.json();
      if (data.success) {
        setSignature(data.data);
        setSigMessage("Signature saved");
        setTimeout(() => setSigMessage(null), 3000);
      } else {
        setSigMessage("Failed to save signature");
      }
    } catch {
      setSigMessage("Failed to save signature");
    } finally {
      setSigSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Domain & Email
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Configure your custom domain and email settings.
          </p>
        </div>
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Domain & Email
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Configure your custom domain and email settings.
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      </div>
    );
  }

  const hasDomain = !!domainConfig?.domain;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Domain & Email
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Configure your custom domain and email settings.
        </p>
      </div>

      <div className="max-w-2xl">
        {/* Show existing domains first when configured */}
        {hasDomain && (
          <div className="mb-8">
            <DomainSetupCard
              domainConfig={domainConfig}
              additionalDomains={additionalDomains}
              emailConfig={emailConfig}
              onAddDomain={handleAddDomain}
              onVerifyDomain={handleVerifyDomain}
              onRemoveDomain={handleRemoveDomain}
              onSetupEmail={handleSetupEmail}
              onVerifyEmail={handleVerifyEmail}
              onDisableEmail={handleDisableEmail}
              emailDnsRecords={emailDnsRecords}
            />
          </div>
        )}

        {/* Add domain section — always show tabs */}
        <div>
          {hasDomain && (
            <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
              Add Another Domain
            </h2>
          )}
          <div className="flex border-b border-gray-200 mb-6">
            <button
              onClick={() => setActiveTab("search")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "search"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Search & Buy
            </button>
            <button
              onClick={() => setActiveTab("byod")}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === "byod"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              I Have a Domain
            </button>
          </div>

          {activeTab === "search" ? (
            <DomainSearchCard onPurchaseComplete={fetchStatus} />
          ) : (
            <DomainSetupCard
              onAddDomain={handleAddDomain}
              onVerifyDomain={handleVerifyDomain}
              onRemoveDomain={handleRemoveDomain}
              onSetupEmail={handleSetupEmail}
              onVerifyEmail={handleVerifyEmail}
              onDisableEmail={handleDisableEmail}
            />
          )}
        </div>

        {/* Email Signature Section */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
            Email Signature
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-[var(--text-muted)]">
                Automatically append a signature to outgoing emails.
              </p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={signature.enabled}
                  onChange={(e) =>
                    setSignature((s) => ({ ...s, enabled: e.target.checked }))
                  }
                  className="w-4 h-4 text-[var(--color-primary)] rounded focus:ring-[var(--color-primary)]"
                />
                <span className="text-sm text-gray-700">Enabled</span>
              </label>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Signature Text
                </label>
                <textarea
                  value={signature.text}
                  onChange={(e) =>
                    setSignature((s) => ({
                      ...s,
                      text: e.target.value,
                      html: e.target.value.replace(/\n/g, "<br>"),
                    }))
                  }
                  rows={4}
                  placeholder="e.g. John Smith&#10;CEO, Acme Inc.&#10;(555) 123-4567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y"
                />
              </div>

              {signature.text && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Preview:</p>
                  <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                    <div
                      className="text-sm text-gray-600 border-t border-gray-300 pt-2"
                      style={{ whiteSpace: "pre-line" }}
                    >
                      {signature.text}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveSignature}
                  disabled={sigSaving}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-50"
                >
                  {sigSaving ? "Saving..." : "Save Signature"}
                </button>
                {sigMessage && (
                  <span
                    className={`text-sm ${
                      sigMessage.includes("Failed")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {sigMessage}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
