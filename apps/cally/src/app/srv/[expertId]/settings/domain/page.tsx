"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { DomainSetupCard } from "@/components/domain";
import LoadingSpinner from "@/components/LoadingSpinner";
import type {
  DomainConfig,
  EmailConfig,
  DomainStatusResponse,
  TenantDnsRecord,
} from "@/types";

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
  const [emailConfig, setEmailConfig] = useState<EmailConfig | undefined>();
  const [emailDnsRecords, setEmailDnsRecords] = useState<TenantDnsRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Fetch domain status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/data/app/domain/status");
      const data = await response.json();

      if (data.success) {
        const statusData = data.data as DomainStatusResponse;
        setDomainConfig(statusData.domainConfig);
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

  // Verify domain
  const handleVerifyDomain = async (): Promise<{ verified: boolean }> => {
    const response = await fetch("/api/data/app/domain/verify", {
      method: "POST",
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Verification failed");
    }

    await fetchStatus();
    return { verified: data.data.verified };
  };

  // Remove domain
  const handleRemoveDomain = async (): Promise<void> => {
    const response = await fetch("/api/data/app/domain/remove", {
      method: "DELETE",
    });
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to remove domain");
    }

    setDomainConfig(undefined);
    setEmailConfig(undefined);
    setEmailDnsRecords([]);
  };

  // Setup email
  const handleSetupEmail = async (
    emailPrefix: string,
    forwardToEmail: string,
  ): Promise<void> => {
    const response = await fetch("/api/data/app/domain/email/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailPrefix, forwardToEmail }),
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
        <DomainSetupCard
          domainConfig={domainConfig}
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
    </div>
  );
}
