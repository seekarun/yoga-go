'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant, TenantDnsRecord } from '@/types';

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
  emailDnsRecords?: TenantDnsRecord[];
  emailVerificationStatus?: {
    sesVerified: boolean;
    dkimVerified: boolean;
    mxVerified: boolean;
    spfVerified: boolean;
    allVerified: boolean;
  };
}

interface DomainStatus {
  verified: boolean;
  checking: boolean;
  records?: Array<{
    type: string;
    name: string;
    value: string;
  }>;
}

interface EmailSettings {
  platformEmail: string;
  forwardingEmail: string | null;
  emailForwardingEnabled: boolean;
}

type TabType = 'domain' | 'email';

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const expertId = params.expertId as string;

  // Tab state - default to 'domain', can be set via URL param
  const initialTab = (searchParams.get('tab') as TabType) || 'domain';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Shared state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Domain state
  const [tenant, setTenant] = useState<TenantWithVerification | null>(null);
  const [newDomain, setNewDomain] = useState('');
  const [domainStatuses, setDomainStatuses] = useState<Record<string, DomainStatus>>({});
  const [emailDnsRecords, setEmailDnsRecords] = useState<TenantDnsRecord[]>([]);
  const [emailSetupLoading, setEmailSetupLoading] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Email settings state
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [forwardingEmail, setForwardingEmail] = useState('');
  const [emailForwardingEnabled, setEmailForwardingEnabled] = useState(true);

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      router.push(`/srv/${user.expertProfile}/settings`);
    }
  }, [user, expertId, router]);

  const fetchTenant = useCallback(async () => {
    try {
      const response = await fetch('/data/app/tenant');
      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
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
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching tenant:', err);
    }
  }, []);

  const fetchEmailSettings = useCallback(async () => {
    try {
      const response = await fetch('/data/app/expert/email');
      const data = await response.json();

      if (data.success) {
        setEmailSettings(data.data);
        setForwardingEmail(data.data.forwardingEmail || '');
        setEmailForwardingEnabled(data.data.emailForwardingEnabled);
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching email settings:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTenant(), fetchEmailSettings()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTenant, fetchEmailSettings]);

  // Domain functions
  const validateDomain = (domain: string): boolean => {
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    return domainRegex.test(domain);
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
        body: JSON.stringify({ action: 'verify_domain', domain }),
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
          setSuccess(`${domain} is now verified!`);
        } else {
          setError('DNS not yet propagated. Please wait and try again.');
        }
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      console.error('[DBG][settings] Error verifying domain:', err);
      setError('Failed to verify domain');
    } finally {
      setDomainStatuses(prev => ({
        ...prev,
        [domain]: { ...prev[domain], checking: false },
      }));
    }
  };

  const handleCreateTenant = async () => {
    if (!newDomain.trim() || !validateDomain(newDomain.trim())) {
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
        setTenant(data.data);
        setNewDomain('');
        if (data.data.domainVerification) {
          setDomainStatuses({
            [data.data.primaryDomain]: {
              verified: data.data.domainVerification.verified,
              checking: false,
              records: data.data.domainVerification.records,
            },
          });
        }
        setSuccess('Domain added! Configure DNS records below.');
      } else {
        setError(data.error || 'Failed to create tenant');
      }
    } catch (err) {
      console.error('[DBG][settings] Error creating tenant:', err);
      setError('Failed to create tenant');
    } finally {
      setSaving(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomain.trim() || !validateDomain(newDomain.trim())) {
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
        setTenant(data.data);
        const addedDomain = newDomain.trim().toLowerCase();
        setNewDomain('');
        if (data.data.domainVerification) {
          setDomainStatuses(prev => ({
            ...prev,
            [addedDomain]: {
              verified: data.data.domainVerification?.verified || false,
              checking: false,
              records: data.data.domainVerification?.records,
            },
          }));
        }
        setSuccess('Domain added!');
      } else {
        setError(data.error || 'Failed to add domain');
      }
    } catch (err) {
      console.error('[DBG][settings] Error adding domain:', err);
      setError('Failed to add domain');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDomain = async (domain: string) => {
    if (!confirm(`Are you sure you want to remove ${domain}?`)) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_domain', domain }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        setDomainStatuses(prev => {
          const updated = { ...prev };
          delete updated[domain];
          return updated;
        });
        setSuccess('Domain removed!');
      } else {
        setError(data.error || 'Failed to remove domain');
      }
    } catch (err) {
      console.error('[DBG][settings] Error removing domain:', err);
      setError('Failed to remove domain');
    } finally {
      setSaving(false);
    }
  };

  // Email setup functions
  const getCustomDomain = (): string | null => {
    if (!tenant) return null;
    const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])];
    return allDomains.find(d => !d.endsWith('.myyoga.guru') && d !== 'myyoga.guru') || null;
  };

  const isCustomDomainVerified = (): boolean => {
    const customDomain = getCustomDomain();
    if (!customDomain) return false;
    return domainStatuses[customDomain]?.verified || false;
  };

  const handleEnableEmail = async () => {
    const customDomain = getCustomDomain();
    if (!customDomain) {
      setError('Please add a custom domain first');
      return;
    }

    setEmailSetupLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enable_domain_email', domain: customDomain }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        if (data.data?.emailDnsRecords) {
          setEmailDnsRecords(data.data.emailDnsRecords);
        }
        setSuccess('Email enabled! Add the DNS records below.');
      } else {
        setError(data.error || 'Failed to enable email');
      }
    } catch (err) {
      console.error('[DBG][settings] Error enabling email:', err);
      setError('Failed to enable email');
    } finally {
      setEmailSetupLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    const customDomain = getCustomDomain();
    if (!customDomain) return;

    setEmailVerifying(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify_domain_email', domain: customDomain }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        if (data.data?.emailVerificationStatus?.allVerified) {
          setSuccess('Email verified and ready to use!');
        } else {
          setError('Some DNS records are still pending.');
        }
      } else {
        setError(data.error || 'Failed to verify email');
      }
    } catch (err) {
      console.error('[DBG][settings] Error verifying email:', err);
      setError('Failed to verify email');
    } finally {
      setEmailVerifying(false);
    }
  };

  const handleGetEmailDnsRecords = useCallback(async () => {
    if (!tenant?.emailConfig) return;
    const customDomain = getCustomDomain();
    if (!customDomain) return;

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_email_dns_records', domain: customDomain }),
      });

      const data = await response.json();
      if (data.success && data.data?.emailDnsRecords) {
        setEmailDnsRecords(data.data.emailDnsRecords);
      }
    } catch (err) {
      console.error('[DBG][settings] Error getting email DNS records:', err);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.emailConfig]);

  useEffect(() => {
    if (tenant?.emailConfig && !emailDnsRecords.length) {
      handleGetEmailDnsRecords();
    }
  }, [tenant?.emailConfig, emailDnsRecords.length, handleGetEmailDnsRecords]);

  // Email forwarding functions
  const handleSaveEmailSettings = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/expert/email', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forwardingEmail: forwardingEmail.trim() || null,
          emailForwardingEnabled,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSettings(data.data);
        setSuccess('Email settings updated!');
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('[DBG][settings] Error saving email settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Helper functions
  const getAllDomains = (): string[] => {
    if (!tenant) return [];
    return [tenant.primaryDomain, ...(tenant.additionalDomains || [])];
  };

  const getVerificationRecords = (): Array<{ type: string; name: string; value: string }> => {
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

  const hasByodEmail =
    tenant?.emailConfig?.sesVerificationStatus === 'verified' && tenant?.emailConfig?.domainEmail;

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading settings...</div>
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
            Domain & Email Settings
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Manage your custom domain and email configuration.
          </p>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '0',
            marginBottom: '24px',
            borderBottom: '2px solid #e5e5e5',
          }}
        >
          <button
            onClick={() => setActiveTab('domain')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'domain' ? 'var(--color-primary)' : '#666',
              borderBottom:
                activeTab === 'domain' ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            Custom Domain
          </button>
          <button
            onClick={() => setActiveTab('email')}
            style={{
              padding: '12px 24px',
              border: 'none',
              background: 'none',
              fontSize: '15px',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'email' ? 'var(--color-primary)' : '#666',
              borderBottom:
                activeTab === 'email' ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            Email Settings
          </button>
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

        {/* Domain Tab */}
        {activeTab === 'domain' && (
          <>
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
                  automatically provisioned.
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
                      <span
                        style={{
                          background: domainStatuses[tenant.primaryDomain]?.verified
                            ? '#0a0'
                            : '#f90',
                          color: '#fff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}
                      >
                        {domainStatuses[tenant.primaryDomain]?.verified
                          ? 'Verified'
                          : 'Pending DNS'}
                      </span>
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
                        {domainStatuses[tenant.primaryDomain]?.checking ? 'Checking...' : 'Verify'}
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
                        <span
                          style={{
                            background: domainStatuses[domain]?.verified ? '#0a0' : '#f90',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {domainStatuses[domain]?.verified ? 'Verified' : 'Pending DNS'}
                        </span>
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

                {/* DNS Instructions */}
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
                      Add the following DNS records with your domain provider:
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
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr',
                                gap: '4px',
                              }}
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
                        <>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '80px 1fr',
                              gap: '4px',
                            }}
                          >
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
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '80px 1fr',
                                gap: '4px',
                              }}
                            >
                              <strong>Type:</strong>
                              <span>CNAME</span>
                              <strong>Name:</strong>
                              <span>www</span>
                              <strong>Value:</strong>
                              <span>cname.vercel-dns.com</span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Custom Domain Email Setup */}
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

                    {!tenant?.emailConfig && (
                      <>
                        <p style={{ color: '#666', marginBottom: '16px' }}>
                          Enable email for your custom domain to send emails from{' '}
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
                            Verify your custom domain DNS first.
                          </p>
                        )}
                      </>
                    )}

                    {tenant?.emailConfig && (
                      <>
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
                          <span
                            style={{
                              background:
                                tenant.emailConfig.sesVerificationStatus === 'verified'
                                  ? '#0a0'
                                  : '#f90',
                              color: '#fff',
                              padding: '4px 12px',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '500',
                            }}
                          >
                            {tenant.emailConfig.sesVerificationStatus === 'verified'
                              ? 'Verified'
                              : 'Pending'}
                          </span>
                        </div>

                        {tenant.emailConfig.sesVerificationStatus !== 'verified' && (
                          <>
                            {/* Verification Status */}
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1fr',
                                gap: '12px',
                                marginBottom: '16px',
                              }}
                            >
                              {['DKIM', 'MX', 'SPF'].map(type => {
                                const verified =
                                  tenant.emailConfig?.[
                                    `${type.toLowerCase()}Verified` as keyof typeof tenant.emailConfig
                                  ];
                                return (
                                  <div
                                    key={type}
                                    style={{
                                      padding: '12px',
                                      background: verified ? '#efe' : '#fef',
                                      borderRadius: '8px',
                                      textAlign: 'center',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        marginBottom: '4px',
                                      }}
                                    >
                                      {type}
                                    </div>
                                    <div
                                      style={{
                                        fontWeight: '500',
                                        color: verified ? '#060' : '#c00',
                                      }}
                                    >
                                      {verified ? 'Verified' : 'Pending'}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Email DNS Records */}
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
                                  style={{
                                    fontSize: '14px',
                                    fontWeight: '600',
                                    marginBottom: '12px',
                                  }}
                                >
                                  Add these DNS records:
                                </h3>
                                {emailDnsRecords.map((record, index) => (
                                  <div
                                    key={index}
                                    style={{
                                      marginBottom: index < emailDnsRecords.length - 1 ? '16px' : 0,
                                      paddingBottom:
                                        index < emailDnsRecords.length - 1 ? '16px' : 0,
                                      borderBottom:
                                        index < emailDnsRecords.length - 1
                                          ? '1px solid #ddd'
                                          : 'none',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: '12px',
                                        color: '#666',
                                        marginBottom: '4px',
                                      }}
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
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Email Tab */}
        {activeTab === 'email' && (
          <>
            {/* Custom Domain Email (if configured) */}
            {hasByodEmail && (
              <div
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '24px',
                  border: '2px solid #10b981',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '16px',
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                    Custom Domain Email
                  </h2>
                  <span
                    style={{
                      padding: '2px 8px',
                      background: '#dcfce7',
                      color: '#166534',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    PRIMARY
                  </span>
                </div>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  Emails to customers on your custom domain will be sent from this address.
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '16px',
                    background: '#f0fdf4',
                    borderRadius: '8px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      fontFamily: 'monospace',
                      fontSize: '16px',
                      fontWeight: '500',
                      color: '#166534',
                    }}
                  >
                    {tenant?.emailConfig?.domainEmail}
                  </div>
                  <button
                    onClick={() => copyToClipboard(tenant?.emailConfig?.domainEmail || '')}
                    style={{
                      padding: '8px 16px',
                      background: '#dcfce7',
                      color: '#166534',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {/* Platform Email */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                marginBottom: '24px',
              }}
            >
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                  {hasByodEmail ? 'Platform Email (Fallback)' : 'Your Expert Email Address'}
                </h2>
                {!hasByodEmail && (
                  <span
                    style={{
                      padding: '2px 8px',
                      background: '#dbeafe',
                      color: '#1d4ed8',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '600',
                    }}
                  >
                    ACTIVE
                  </span>
                )}
              </div>
              <p style={{ color: '#666', marginBottom: '16px' }}>
                {hasByodEmail
                  ? `Used for emails on your subdomain (${expertId}.myyoga.guru) or as a fallback.`
                  : 'Payment confirmations and transactional emails are sent from this address.'}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '16px',
                  background: '#f8f8f8',
                  borderRadius: '8px',
                }}
              >
                <div
                  style={{
                    flex: 1,
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: 'var(--color-primary)',
                  }}
                >
                  {emailSettings?.platformEmail || `${expertId}@myyoga.guru`}
                </div>
                <button
                  onClick={() =>
                    copyToClipboard(emailSettings?.platformEmail || `${expertId}@myyoga.guru`)
                  }
                  style={{
                    padding: '8px 16px',
                    background: '#eef',
                    color: '#00a',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Copy
                </button>
              </div>
            </div>

            {/* Set Up Custom Domain Email (prompt if not configured) */}
            {!hasByodEmail && getCustomDomain() && (
              <div
                style={{
                  background: '#fefce8',
                  borderRadius: '12px',
                  padding: '24px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  marginBottom: '24px',
                  border: '1px solid #fde047',
                }}
              >
                <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
                  Set Up Custom Domain Email
                </h2>
                <p style={{ color: '#713f12', marginBottom: '16px' }}>
                  You have a custom domain ({getCustomDomain()}) configured. Set up email for a more
                  professional experience.
                </p>
                <button
                  onClick={() => setActiveTab('domain')}
                  style={{
                    padding: '10px 20px',
                    background: '#eab308',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '14px',
                    cursor: 'pointer',
                  }}
                >
                  Set Up Domain Email
                </button>
              </div>
            )}

            {/* Email Forwarding */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Email Forwarding
              </h2>
              <p style={{ color: '#666', marginBottom: '20px' }}>
                Incoming emails to your expert address will be forwarded to your personal email.
              </p>

              {/* Toggle */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                  padding: '12px 16px',
                  background: '#f8f8f8',
                  borderRadius: '8px',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer',
                    flex: 1,
                  }}
                >
                  <input
                    type="checkbox"
                    checked={emailForwardingEnabled}
                    onChange={e => setEmailForwardingEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span style={{ fontWeight: '500' }}>Enable email forwarding</span>
                </label>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '500',
                    background: emailForwardingEnabled ? '#dcfce7' : '#fee',
                    color: emailForwardingEnabled ? '#166534' : '#c00',
                  }}
                >
                  {emailForwardingEnabled ? 'Active' : 'Disabled'}
                </span>
              </div>

              {/* Forwarding Email Input */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    marginBottom: '8px',
                  }}
                >
                  Forward emails to:
                </label>
                <input
                  type="email"
                  value={forwardingEmail}
                  onChange={e => setForwardingEmail(e.target.value)}
                  placeholder="your-personal-email@example.com"
                  disabled={!emailForwardingEnabled}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '15px',
                    opacity: emailForwardingEnabled ? 1 : 0.6,
                  }}
                />
              </div>

              <button
                onClick={handleSaveEmailSettings}
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
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
