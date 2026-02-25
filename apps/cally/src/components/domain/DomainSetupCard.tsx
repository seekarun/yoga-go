"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import InlineToast from "@/components/InlineToast";
import type { InlineToastType } from "@/components/InlineToast";
import DomainStatusBadge from "./DomainStatusBadge";
import NameserverInstructions from "./NameserverInstructions";
import DnsInstructions from "./DnsInstructions";
import EmailSetupCard from "./EmailSetupCard";
import PurchasedDomainBanner from "./PurchasedDomainBanner";
import type { DomainConfig, EmailConfig, TenantDnsRecord } from "@/types";

type DnsManagement = "vercel" | "self";

interface AddDomainResult {
  nameservers: string[];
  dnsRecords?: Array<{
    type: string;
    name: string;
    value: string;
    purpose: string;
  }>;
}

interface DomainSetupCardProps {
  domainConfig?: DomainConfig;
  additionalDomains?: DomainConfig[];
  emailConfig?: EmailConfig;
  onAddDomain: (
    domain: string,
    dnsManagement: DnsManagement,
  ) => Promise<AddDomainResult>;
  onVerifyDomain: (domain?: string) => Promise<{ verified: boolean }>;
  onRemoveDomain: (domain?: string) => Promise<void>;
  onSetupEmail: (
    emailPrefix: string,
    forwardToEmail: string,
    forwardToCal: boolean,
  ) => Promise<void>;
  onVerifyEmail: () => Promise<void>;
  onDisableEmail: () => Promise<void>;
  emailDnsRecords?: TenantDnsRecord[];
  defaultForwardEmail?: string;
}

export default function DomainSetupCard({
  domainConfig,
  additionalDomains = [],
  emailConfig,
  onAddDomain,
  onVerifyDomain,
  onRemoveDomain,
  onSetupEmail,
  onVerifyEmail,
  onDisableEmail,
  emailDnsRecords = [],
  defaultForwardEmail,
}: DomainSetupCardProps) {
  const [domain, setDomain] = useState("");
  const [nameservers, setNameservers] = useState<string[]>([]);
  const [selfManagedRecords, setSelfManagedRecords] = useState<
    Array<{ type: string; name: string; value: string; purpose: string }>
  >([]);
  const [dnsManagement, setDnsManagement] = useState<DnsManagement>("vercel");
  const [domainAdded, setDomainAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [additionalDomainLoading, setAdditionalDomainLoading] = useState<
    string | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: InlineToastType;
  } | null>(null);

  const hasDomain = !!domainConfig?.domain;
  const isDomainVerified = domainConfig?.vercelVerified;
  const effectiveDnsManagement = domainConfig?.dnsManagement ?? "vercel";

  const handleAddDomain = async () => {
    if (!domain.trim()) {
      setError("Domain is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await onAddDomain(domain, dnsManagement);
      setNameservers(result.nameservers);
      if (dnsManagement === "self" && result.dnsRecords) {
        setSelfManagedRecords(result.dnsRecords);
      }
      setDomainAdded(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add domain");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDomain = async () => {
    setVerifying(true);
    setError(null);
    setToast(null);
    try {
      const result = await onVerifyDomain();
      if (result.verified) {
        setToast({ message: "Domain verified successfully!", type: "success" });
      } else {
        setToast({
          message:
            "DNS changes haven't propagated yet. This can take up to 48 hours.",
          type: "warning",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (
      !confirm(
        "Are you sure you want to remove this domain? This will also disable any email configured for this domain.",
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onRemoveDomain();
      setDomain("");
      setNameservers([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAdditionalDomain = async (domainName: string) => {
    setAdditionalDomainLoading(domainName);
    setError(null);
    setToast(null);
    try {
      const result = await onVerifyDomain(domainName);
      if (result.verified) {
        setToast({
          message: `${domainName} verified successfully!`,
          type: "success",
        });
      } else {
        setToast({
          message:
            "DNS changes haven't propagated yet. This can take up to 48 hours.",
          type: "warning",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setAdditionalDomainLoading(null);
    }
  };

  const handleRemoveAdditionalDomain = async (domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}?`)) {
      return;
    }

    setAdditionalDomainLoading(domainName);
    setError(null);
    try {
      await onRemoveDomain(domainName);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove domain");
    } finally {
      setAdditionalDomainLoading(null);
    }
  };

  // State 1: No domain configured
  if (!hasDomain) {
    return (
      <div className="space-y-6">
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
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">
              Connect Your Domain
            </h3>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Connect your existing domain to use a custom URL for your calendar
            and landing page.
          </p>

          <div className="space-y-4">
            {/* Step 1: Enter domain and click Connect */}
            {!domainAdded && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain Name
                  </label>
                  <input
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="yourdomain.com"
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                    {error}
                  </div>
                )}

                <PrimaryButton
                  onClick={handleAddDomain}
                  loading={loading}
                  fullWidth
                >
                  Connect Domain
                </PrimaryButton>
              </>
            )}

            {/* Step 2: After Connect — show DNS configuration */}
            {domainAdded && (
              <>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{domain}</p>
                </div>

                {/* Default: CallyGo Manages — show NS instructions */}
                {dnsManagement === "vercel" && (
                  <>
                    <NameserverInstructions
                      nameservers={
                        nameservers.length > 0
                          ? nameservers
                          : ["ns1.vercel-dns.com", "ns2.vercel-dns.com"]
                      }
                    />
                    <button
                      type="button"
                      onClick={() => setDnsManagement("self")}
                      className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                    >
                      I&apos;ll manage DNS myself
                    </button>
                  </>
                )}

                {/* Self-Manage: show A/CNAME records */}
                {dnsManagement === "self" && (
                  <>
                    {selfManagedRecords.length > 0 ? (
                      <DnsInstructions
                        records={selfManagedRecords}
                        title="DNS Records for Your Landing Page"
                        description="Add these records at your domain registrar to point your domain to CallyGo:"
                      />
                    ) : (
                      <DnsInstructions
                        records={[
                          {
                            type: "A",
                            name: "@",
                            value: "76.76.21.21",
                            purpose: "Points your root domain to CallyGo",
                          },
                          {
                            type: "CNAME",
                            name: "www",
                            value: "cname.vercel-dns.com",
                            purpose: "Points www subdomain to CallyGo",
                          },
                        ]}
                        title="DNS Records for Your Landing Page"
                        description="Add these records at your domain registrar to point your domain to CallyGo:"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setDnsManagement("vercel")}
                      className="text-sm text-[var(--color-primary)] hover:underline font-medium"
                    >
                      Let CallyGo manage DNS instead
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // State 2 & 3: Domain configured
  return (
    <div className="space-y-6">
      {/* Domain Card */}
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
                d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
              />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900">Domain</h3>
          </div>
          <DomainStatusBadge
            verified={isDomainVerified ?? false}
            pending={!isDomainVerified}
          />
        </div>

        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-lg font-medium text-gray-900">
              {domainConfig.domain}
            </p>
            {domainConfig.vercelVerifiedAt && (
              <p className="text-xs text-gray-500 mt-1">
                Verified on{" "}
                {new Date(domainConfig.vercelVerifiedAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {domainConfig.purchaseConfig && (
            <PurchasedDomainBanner
              purchaseConfig={domainConfig.purchaseConfig}
            />
          )}

          {!isDomainVerified && effectiveDnsManagement === "vercel" && (
            <NameserverInstructions
              nameservers={["ns1.vercel-dns.com", "ns2.vercel-dns.com"]}
            />
          )}

          {!isDomainVerified && effectiveDnsManagement === "self" && (
            <DnsInstructions
              records={[
                {
                  type: "A",
                  name: "@",
                  value: "76.76.21.21",
                  purpose: "Points your root domain to CallyGo",
                },
                {
                  type: "CNAME",
                  name: "www",
                  value: "cname.vercel-dns.com",
                  purpose: "Points www subdomain to CallyGo",
                },
              ]}
              title="DNS Records for Your Landing Page"
              description="Add these records at your domain registrar to point your domain to CallyGo:"
            />
          )}

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            {!isDomainVerified && (
              <PrimaryButton onClick={handleVerifyDomain} loading={verifying}>
                Check Verification
              </PrimaryButton>
            )}
            <SecondaryButton onClick={handleRemoveDomain} loading={loading}>
              Remove Domain
            </SecondaryButton>
          </div>

          {toast && (
            <InlineToast
              message={toast.message}
              type={toast.type}
              duration={5000}
              onDismiss={() => setToast(null)}
            />
          )}
        </div>
      </div>

      {/* Additional Domains */}
      {additionalDomains.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Domains
          </h3>
          <div className="space-y-3">
            {additionalDomains.map((d) => (
              <div
                key={d.domain}
                className="flex items-center justify-between bg-gray-50 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium text-gray-900">{d.domain}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <DomainStatusBadge
                      verified={d.vercelVerified}
                      pending={!d.vercelVerified}
                    />
                    {d.purchaseConfig && (
                      <span className="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        Purchased
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!d.vercelVerified && (
                    <PrimaryButton
                      onClick={() => handleVerifyAdditionalDomain(d.domain)}
                      loading={additionalDomainLoading === d.domain}
                    >
                      Verify
                    </PrimaryButton>
                  )}
                  <SecondaryButton
                    onClick={() => handleRemoveAdditionalDomain(d.domain)}
                    loading={additionalDomainLoading === d.domain}
                  >
                    Remove
                  </SecondaryButton>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Setup Card - only show if domain is verified */}
      {isDomainVerified && (
        <EmailSetupCard
          domain={domainConfig.domain}
          emailConfig={emailConfig}
          onSetupEmail={onSetupEmail}
          onVerifyEmail={onVerifyEmail}
          onDisableEmail={onDisableEmail}
          dnsRecords={emailDnsRecords}
          defaultForwardEmail={defaultForwardEmail}
          dnsManagement={effectiveDnsManagement}
        />
      )}
    </div>
  );
}
