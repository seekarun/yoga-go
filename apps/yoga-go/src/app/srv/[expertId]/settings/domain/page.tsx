'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types';

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
