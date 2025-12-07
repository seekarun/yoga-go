'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant, TenantDnsRecord, TenantEmailConfig } from '@/types';

// Extended tenant type with domain verification info
interface TenantWithVerification extends Tenant {
  domainVerification?: {
    verified: boolean;
    records?: Array<{
      type: 'TXT' | 'CNAME';
      name: string;
      value: string;
    }>;
  };
  // Email setup response fields
  emailDnsRecords?: TenantDnsRecord[];
  emailVerificationStatus?: {
    sesVerified: boolean;
    dkimVerified: boolean;
    mxVerified: boolean;
    spfVerified: boolean;
    allVerified: boolean;
  };
}

// Domain status state
interface DomainStatus {
  verified: boolean;
  checking: boolean;
  records?: Array<{
    type: 'TXT' | 'CNAME';
    name: string;
    value: string;
  }>;
}

export default function DomainSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [tenant, setTenant] = useState<TenantWithVerification | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [domainStatuses, setDomainStatuses] = useState<Record<string, DomainStatus>>({});

  // Email setup state
  const [emailDnsRecords, setEmailDnsRecords] = useState<TenantDnsRecord[]>([]);
  const [emailSetupLoading, setEmailSetupLoading] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      console.log('[DBG][domain-settings] User doesnt own this profile');
      router.push(`/srv/${user.expertProfile}/settings/domain`);
    }
  }, [user, expertId, router]);

  const fetchTenant = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/data/app/tenant');
      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        // Initialize domain verification if available
        if (data.data?.domainVerification) {
          setDomainStatuses(prev => ({
            ...prev,
            [data.data.primaryDomain]: {
              verified: data.data.domainVerification.verified,
              checking: false,
              records: data.data.domainVerification.records,
            },
          }));
        }
      } else {
        console.log('[DBG][domain-settings] No tenant found, can create one');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error fetching tenant:', err);
      setError('Failed to load domain settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTenant();
  }, [fetchTenant]);

  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
  };

  // Reserved for future use - periodic domain status check
  const _checkDomainStatus = async (domain: string) => {
    setDomainStatuses(prev => ({
      ...prev,
      [domain]: { ...prev[domain], checking: true },
    }));

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_domain',
          domain,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.domainVerification) {
        setDomainStatuses(prev => ({
          ...prev,
          [domain]: {
            verified: data.data.domainVerification.verified,
            checking: false,
            records: data.data.domainVerification.records,
          },
        }));

        if (data.data.domainVerification.verified) {
          setSuccess(`${domain} is verified and active!`);
        }
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error checking domain:', err);
    } finally {
      setDomainStatuses(prev => ({
        ...prev,
        [domain]: { ...prev[domain], checking: false },
      }));
    }
  };

  const verifyDomain = async (domain: string) => {
    setDomainStatuses(prev => ({
      ...prev,
      [domain]: { ...prev[domain], checking: true },
    }));
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_domain',
          domain,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.domainVerification) {
        setDomainStatuses(prev => ({
          ...prev,
          [domain]: {
            verified: data.data.domainVerification.verified,
            checking: false,
          },
        }));

        if (data.data.domainVerification.verified) {
          setSuccess(
            `${domain} is now verified! SSL certificate will be provisioned automatically.`
          );
        } else {
          setError('DNS not yet propagated. Please wait and try again.');
        }
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error verifying domain:', err);
      setError('Failed to verify domain');
    } finally {
      setDomainStatuses(prev => ({
        ...prev,
        [domain]: { ...prev[domain], checking: false },
      }));
    }
  };

  const handleCreateTenant = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a primary domain');
      return;
    }

    if (!validateDomain(newDomain.trim())) {
      setError('Please enter a valid domain (e.g., yourdomain.com)');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryDomain: newDomain.trim().toLowerCase(),
          featuredOnPlatform: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const tenantData = data.data as TenantWithVerification;
        setTenant(tenantData);
        setNewDomain('');

        // Store verification info
        if (tenantData.domainVerification) {
          setDomainStatuses({
            [tenantData.primaryDomain]: {
              verified: tenantData.domainVerification.verified,
              checking: false,
              records: tenantData.domainVerification.records,
            },
          });
        }

        setSuccess('Domain added! Configure DNS records below to complete setup.');
      } else {
        setError(data.error || 'Failed to create tenant');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error creating tenant:', err);
      setError('Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain');
      return;
    }

    if (!validateDomain(newDomain.trim())) {
      setError('Please enter a valid domain (e.g., yourdomain.com)');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_domain',
          domain: newDomain.trim().toLowerCase(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        const tenantData = data.data as TenantWithVerification;
        setTenant(tenantData);
        const addedDomain = newDomain.trim().toLowerCase();
        setNewDomain('');

        // Store verification info for new domain
        if (tenantData.domainVerification) {
          setDomainStatuses(prev => ({
            ...prev,
            [addedDomain]: {
              verified: tenantData.domainVerification?.verified || false,
              checking: false,
              records: tenantData.domainVerification?.records,
            },
          }));
        }

        setSuccess('Domain added! Configure DNS records to complete setup.');
      } else {
        setError(data.error || 'Failed to add domain');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error adding domain:', err);
      setError('Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!confirm(`Are you sure you want to remove ${domain}?`)) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_domain',
          domain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        // Remove from domain statuses
        setDomainStatuses(prev => {
          const updated = { ...prev };
          delete updated[domain];
          return updated;
        });
        setSuccess('Domain removed successfully!');
      } else {
        setError(data.error || 'Failed to remove domain');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error removing domain:', err);
      setError('Failed to remove domain');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async () => {
    if (!tenant) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          featuredOnPlatform: !tenant.featuredOnPlatform,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        setSuccess('Settings updated!');
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error updating settings:', err);
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  // Email setup handlers
  const handleEnableEmail = async () => {
    if (!tenant) return;

    // Can only enable email for custom domains (not myyoga.guru subdomains)
    const customDomain = getCustomDomain();
    if (!customDomain) {
      setError('Please add a custom domain first (not a myyoga.guru subdomain)');
      return;
    }

    setEmailSetupLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enable_domain_email',
          domain: customDomain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        if (data.data?.emailDnsRecords) {
          setEmailDnsRecords(data.data.emailDnsRecords);
        }
        setSuccess('Email enabled! Add the DNS records below to your domain registrar.');
      } else {
        setError(data.error || 'Failed to enable email');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error enabling email:', err);
      setError('Failed to enable email');
    } finally {
      setEmailSetupLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!tenant) return;

    const customDomain = getCustomDomain();
    if (!customDomain) return;

    setEmailVerifying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_domain_email',
          domain: customDomain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        if (data.data?.emailVerificationStatus?.allVerified) {
          setSuccess('Email verified and ready to use!');
        } else {
          setError('Some DNS records are still pending. Please check your DNS configuration.');
        }
      } else {
        setError(data.error || 'Failed to verify email');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error verifying email:', err);
      setError('Failed to verify email');
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleGetEmailDnsRecords = async () => {
    if (!tenant?.emailConfig) return;

    const customDomain = getCustomDomain();
    if (!customDomain) return;

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_email_dns_records',
          domain: customDomain,
        }),
      });

      const data = await response.json();
      if (data.success && data.data?.emailDnsRecords) {
        setEmailDnsRecords(data.data.emailDnsRecords);
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error getting email DNS records:', err);
    }
  };

  // Get the first custom domain (not myyoga.guru)
  const getCustomDomain = (): string | null => {
    if (!tenant) return null;
    const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])];
    return allDomains.find(d => !d.endsWith('.myyoga.guru') && d !== 'myyoga.guru') || null;
  };

  // Check if custom domain is verified
  const isCustomDomainVerified = (): boolean => {
    const customDomain = getCustomDomain();
    if (!customDomain) return false;
    return domainStatuses[customDomain]?.verified || false;
  };

  // Load email DNS records if email is enabled
  useEffect(() => {
    if (tenant?.emailConfig && !emailDnsRecords.length) {
      handleGetEmailDnsRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.emailConfig]);

  // Get all domains for display
  const getAllDomains = (): string[] => {
    if (!tenant) return [];
    return [tenant.primaryDomain, ...(tenant.additionalDomains || [])];
  };

  // Get verification records for display
  const getVerificationRecords = (): Array<{ type: string; name: string; value: string }> => {
    // Check all domain statuses for records
    for (const status of Object.values(domainStatuses)) {
      if (status.records && status.records.length > 0) {
        return status.records;
      }
    }
    return [];
  };

  const hasUnverifiedDomains = (): boolean => {
    return getAllDomains().some(domain => !domainStatuses[domain]?.verified);
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading domain settings...</div>
      </div>
    );
  }

  const verificationRecords = getVerificationRecords();

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <Link
            href={`/srv/${expertId}`}
            style={{ color: 'var(--color-primary)', textDecoration: 'none', fontSize: '14px' }}
          >
            &larr; Back to Dashboard
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginTop: '16px' }}>
            Domain Settings
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Configure custom domains for your expert portal. SSL certificates are provisioned
            automatically.
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div
            style={{
              background: '#fee',
              color: '#c00',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}
        {success && (
          <div
            style={{
              background: '#efe',
              color: '#060',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
            }}
          >
            {success}
          </div>
        )}

        {/* No Tenant Yet */}
        {!tenant && (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Set Up Your Custom Domain
            </h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Add a custom domain to create your own branded yoga portal. SSL certificates are
              automatically provisioned - no additional configuration needed!
            </p>

            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                type="text"
                value={newDomain}
                onChange={e => setNewDomain(e.target.value)}
                placeholder="e.g., youryogastudio.com"
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '16px',
                }}
              />
              <button
                onClick={handleCreateTenant}
                disabled={saving}
                style={{
                  padding: '12px 24px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? 'Setting up...' : 'Set Up Domain'}
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#999' }}>
              After setup, you&apos;ll just need to point your domain to our servers.
            </p>
          </div>
        )}

        {/* Existing Tenant */}
        {tenant && (
          <>
            {/* Current Domains */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Your Domains
              </h2>

              {/* Primary Domain */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: '#f8f8f8',
                  borderRadius: '8px',
                  marginBottom: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontWeight: '500' }}>{tenant.primaryDomain}</span>
                  <span
                    style={{
                      background: 'var(--color-primary)',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                    }}
                  >
                    Primary
                  </span>
                  {domainStatuses[tenant.primaryDomain]?.verified ? (
                    <span
                      style={{
                        background: '#0a0',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      Verified
                    </span>
                  ) : (
                    <span
                      style={{
                        background: '#f90',
                        color: '#fff',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}
                    >
                      Pending DNS
                    </span>
                  )}
                </div>
                {!domainStatuses[tenant.primaryDomain]?.verified && (
                  <button
                    onClick={() => verifyDomain(tenant.primaryDomain)}
                    disabled={domainStatuses[tenant.primaryDomain]?.checking}
                    style={{
                      padding: '4px 12px',
                      background: '#eef',
                      color: '#00a',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {domainStatuses[tenant.primaryDomain]?.checking ? 'Checking...' : 'Verify DNS'}
                  </button>
                )}
              </div>

              {/* Additional Domains */}
              {tenant.additionalDomains?.map(domain => (
                <div
                  key={domain}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#f8f8f8',
                    borderRadius: '8px',
                    marginBottom: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{domain}</span>
                    {domainStatuses[domain]?.verified ? (
                      <span
                        style={{
                          background: '#0a0',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        Verified
                      </span>
                    ) : (
                      <span
                        style={{
                          background: '#f90',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        Pending DNS
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!domainStatuses[domain]?.verified && (
                      <button
                        onClick={() => verifyDomain(domain)}
                        disabled={domainStatuses[domain]?.checking}
                        style={{
                          padding: '4px 12px',
                          background: '#eef',
                          color: '#00a',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        {domainStatuses[domain]?.checking ? 'Checking...' : 'Verify'}
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveDomain(domain)}
                      disabled={saving}
                      style={{
                        padding: '4px 12px',
                        background: '#fee',
                        color: '#c00',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}

              {/* Add Domain */}
              <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                <input
                  type="text"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  placeholder="Add another domain..."
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                />
                <button
                  onClick={handleAddDomain}
                  disabled={saving || !newDomain.trim()}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: saving || !newDomain.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !newDomain.trim() ? 0.7 : 1,
                  }}
                >
                  {saving ? 'Adding...' : 'Add Domain'}
                </button>
              </div>
            </div>

            {/* DNS Instructions - Only show if there are unverified domains */}
            {hasUnverifiedDomains() && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '24px',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  DNS Configuration
                </h2>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  Add the following DNS record with your domain provider to complete setup:
                </p>

                <div
                  style={{
                    background: '#f8f8f8',
                    borderRadius: '8px',
                    padding: '16px',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                  }}
                >
                  {verificationRecords.length > 0 ? (
                    verificationRecords.map((record, index) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: index < verificationRecords.length - 1 ? '16px' : 0,
                        }}
                      >
                        <div
                          style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px' }}
                        >
                          <strong>Type:</strong>
                          <span>{record.type}</span>
                          <strong>Name:</strong>
                          <span style={{ wordBreak: 'break-all' }}>{record.name}</span>
                          <strong>Value:</strong>
                          <span style={{ wordBreak: 'break-all' }}>{record.value}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div>
                      <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px' }}>
                        <strong>Type:</strong>
                        <span>A</span>
                        <strong>Name:</strong>
                        <span>@ (or leave blank)</span>
                        <strong>Value:</strong>
                        <span>76.76.21.21</span>
                      </div>
                      <div
                        style={{
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid #ddd',
                        }}
                      >
                        <div
                          style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '4px' }}
                        >
                          <strong>Type:</strong>
                          <span>CNAME</span>
                          <strong>Name:</strong>
                          <span>www</span>
                          <strong>Value:</strong>
                          <span>cname.vercel-dns.com</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      color: '#666',
                      fontSize: '12px',
                      marginTop: '16px',
                      paddingTop: '12px',
                      borderTop: '1px solid #ddd',
                    }}
                  >
                    DNS changes typically take 1-10 minutes to propagate (up to 48 hours in some
                    cases). Click &quot;Verify DNS&quot; once you&apos;ve added the records.
                  </div>
                </div>
              </div>
            )}

            {/* Email Setup Section - Only show if custom domain exists */}
            {getCustomDomain() && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '24px',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                  Custom Domain Email
                </h2>

                {/* Email not yet enabled */}
                {!tenant?.emailConfig && (
                  <>
                    <p style={{ color: '#666', marginBottom: '16px' }}>
                      Enable email for your custom domain to send and receive emails from{' '}
                      <strong>contact@{getCustomDomain()}</strong>
                    </p>
                    <button
                      onClick={handleEnableEmail}
                      disabled={emailSetupLoading || !isCustomDomainVerified()}
                      style={{
                        padding: '12px 24px',
                        background: isCustomDomainVerified() ? 'var(--color-primary)' : '#ccc',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor:
                          emailSetupLoading || !isCustomDomainVerified()
                            ? 'not-allowed'
                            : 'pointer',
                      }}
                    >
                      {emailSetupLoading ? 'Setting up...' : 'Enable Custom Email'}
                    </button>
                    {!isCustomDomainVerified() && (
                      <p style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                        Verify your custom domain DNS first before enabling email.
                      </p>
                    )}
                  </>
                )}

                {/* Email enabled - show status and DNS records */}
                {tenant?.emailConfig && (
                  <>
                    {/* Email Address */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '16px',
                        background: '#f8f8f8',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                          Your Email Address
                        </div>
                        <div
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '16px',
                            color: 'var(--color-primary)',
                          }}
                        >
                          {tenant.emailConfig.domainEmail}
                        </div>
                      </div>
                      {tenant.emailConfig.sesVerificationStatus === 'verified' ? (
                        <span
                          style={{
                            background: '#0a0',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          Verified
                        </span>
                      ) : (
                        <span
                          style={{
                            background: '#f90',
                            color: '#fff',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Verification Status Details */}
                    {tenant.emailConfig.sesVerificationStatus !== 'verified' && (
                      <>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '12px',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              padding: '12px',
                              background: tenant.emailConfig.dkimVerified ? '#efe' : '#fef',
                              borderRadius: '8px',
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                              DKIM
                            </div>
                            <div
                              style={{
                                fontWeight: '500',
                                color: tenant.emailConfig.dkimVerified ? '#060' : '#c00',
                              }}
                            >
                              {tenant.emailConfig.dkimVerified ? 'Verified' : 'Pending'}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: '12px',
                              background: tenant.emailConfig.mxVerified ? '#efe' : '#fef',
                              borderRadius: '8px',
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                              MX Record
                            </div>
                            <div
                              style={{
                                fontWeight: '500',
                                color: tenant.emailConfig.mxVerified ? '#060' : '#c00',
                              }}
                            >
                              {tenant.emailConfig.mxVerified ? 'Verified' : 'Pending'}
                            </div>
                          </div>
                          <div
                            style={{
                              padding: '12px',
                              background: tenant.emailConfig.spfVerified ? '#efe' : '#fef',
                              borderRadius: '8px',
                              textAlign: 'center',
                            }}
                          >
                            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                              SPF Record
                            </div>
                            <div
                              style={{
                                fontWeight: '500',
                                color: tenant.emailConfig.spfVerified ? '#060' : '#c00',
                              }}
                            >
                              {tenant.emailConfig.spfVerified ? 'Verified' : 'Pending'}
                            </div>
                          </div>
                        </div>

                        {/* DNS Records for Email */}
                        {emailDnsRecords.length > 0 && (
                          <div
                            style={{
                              background: '#f8f8f8',
                              borderRadius: '8px',
                              padding: '16px',
                              marginBottom: '16px',
                            }}
                          >
                            <h3
                              style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}
                            >
                              Add these DNS records:
                            </h3>
                            {emailDnsRecords.map((record, index) => (
                              <div
                                key={index}
                                style={{
                                  marginBottom: index < emailDnsRecords.length - 1 ? '16px' : 0,
                                  paddingBottom: index < emailDnsRecords.length - 1 ? '16px' : 0,
                                  borderBottom:
                                    index < emailDnsRecords.length - 1 ? '1px solid #ddd' : 'none',
                                }}
                              >
                                <div
                                  style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}
                                >
                                  {record.purpose}
                                </div>
                                <div
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '60px 1fr',
                                    gap: '4px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                  }}
                                >
                                  <strong>Type:</strong>
                                  <span>{record.type}</span>
                                  <strong>Name:</strong>
                                  <span style={{ wordBreak: 'break-all' }}>{record.name}</span>
                                  <strong>Value:</strong>
                                  <span style={{ wordBreak: 'break-all' }}>
                                    {record.priority ? `${record.priority} ` : ''}
                                    {record.value}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <button
                          onClick={handleVerifyEmail}
                          disabled={emailVerifying}
                          style={{
                            padding: '10px 20px',
                            background: '#eef',
                            color: '#00a',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: emailVerifying ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {emailVerifying ? 'Verifying...' : 'Verify Email DNS'}
                        </button>
                      </>
                    )}

                    {/* Email verified - show forwarding info */}
                    {tenant.emailConfig.sesVerificationStatus === 'verified' && (
                      <div
                        style={{
                          padding: '12px 16px',
                          background: '#f0f9ff',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#0369a1',
                        }}
                      >
                        <strong>Forwarding to:</strong>{' '}
                        {tenant.emailConfig.forwardToEmail || 'Not configured'}
                        <br />
                        <Link
                          href={`/srv/${expertId}/settings/email`}
                          style={{ color: '#0369a1', textDecoration: 'underline' }}
                        >
                          Manage email settings
                        </Link>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Platform Visibility */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Platform Visibility
              </h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <label
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={tenant.featuredOnPlatform}
                    onChange={handleToggleFeatured}
                    disabled={saving}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Show my profile on myyoga.guru platform</span>
                </label>
              </div>
              <p style={{ color: '#666', fontSize: '13px', marginTop: '8px' }}>
                When enabled, your profile and courses will be visible to all platform users.
                Disable this if you want to operate independently with only your custom domain.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
