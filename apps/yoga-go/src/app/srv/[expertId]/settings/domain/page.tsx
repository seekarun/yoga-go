'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type {
  Tenant,
  TenantDnsRecord,
  TenantEmailConfig,
  TenantBranding,
  DnsManagementMethod,
  CloudflareDnsConfig,
} from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';

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
  const [domainToRemove, setDomainToRemove] = useState<string | null>(null);

  // Email setup state
  const [emailDnsRecords, setEmailDnsRecords] = useState<TenantDnsRecord[]>([]);
  const [emailSetupLoading, setEmailSetupLoading] = useState(false);
  const [emailVerifying, setEmailVerifying] = useState(false);

  // Branding state
  const [branding, setBranding] = useState<TenantBranding>({});
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [faviconUploading, setFaviconUploading] = useState(false);
  const [ogImageUploading, setOgImageUploading] = useState(false);

  // Copy to clipboard state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<'domain' | 'email'>('domain');

  // Cloudflare NS flow state
  const [dnsMethod, setDnsMethod] = useState<DnsManagementMethod>('manual');
  const [cfSetupLoading, setCfSetupLoading] = useState(false);
  const [cfNsCheckLoading, setCfNsCheckLoading] = useState(false);

  const copyToClipboard = async (text: string, fieldId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldId);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('[DBG][domain-settings] Failed to copy:', err);
    }
  };

  // Copyable field component
  const CopyableField = ({
    label,
    value,
    fieldId,
  }: {
    label: string;
    value: string;
    fieldId: string;
  }) => (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', wordBreak: 'break-all' }}
    >
      {value}
      <button
        onClick={() => copyToClipboard(value, fieldId)}
        style={{
          padding: '2px 6px',
          background: copiedField === fieldId ? '#10b981' : '#e5e7eb',
          color: copiedField === fieldId ? '#fff' : '#374151',
          border: 'none',
          borderRadius: '4px',
          fontSize: '10px',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s',
          verticalAlign: 'middle',
        }}
        title={`Copy ${label}`}
      >
        {copiedField === fieldId ? '✓' : 'Copy'}
      </button>
    </span>
  );

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

        // Initialize domain verification statuses from API response
        if (data.data?.domainsVerification) {
          // API now returns verification status for all domains
          const statuses: Record<string, DomainStatus> = {};
          for (const [domain, status] of Object.entries(data.data.domainsVerification)) {
            const verificationStatus = status as {
              verified: boolean;
              records?: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string }>;
            };
            statuses[domain] = {
              verified: verificationStatus.verified,
              checking: false,
              records: verificationStatus.records,
            };
          }
          setDomainStatuses(statuses);
        } else if (data.data?.domainVerification) {
          // Fallback for legacy response format
          setDomainStatuses(prev => ({
            ...prev,
            [data.data.primaryDomain]: {
              verified: data.data.domainVerification.verified,
              checking: false,
              records: data.data.domainVerification.records,
            },
          }));
        }

        // Initialize branding state from tenant
        if (data.data?.branding) {
          setBranding(data.data.branding);
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
        if (tenantData.domainVerification && tenantData.primaryDomain) {
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

        // New domains always start as unverified - user must configure DNS and verify
        setDomainStatuses(prev => ({
          ...prev,
          [addedDomain]: {
            verified: false,
            checking: false,
            records: tenantData.domainVerification?.records,
          },
        }));

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

  const handleRemoveDomainClick = (domain: string) => {
    setDomainToRemove(domain);
  };

  const handleRemoveDomainConfirm = async () => {
    if (!domainToRemove) return;
    const domain = domainToRemove;

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

  // Cloudflare NS handlers
  const handleSetupCloudflareNs = async (domain: string) => {
    setCfSetupLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setup_cloudflare_ns',
          domain,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        setSuccess(
          'Cloudflare zone created! Update your nameservers at your domain registrar to complete setup.'
        );
      } else {
        setError(data.error || 'Failed to set up Cloudflare DNS');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error setting up Cloudflare NS:', err);
      setError('Failed to set up Cloudflare DNS');
    } finally {
      setCfSetupLoading(false);
    }
  };

  const handleCheckCloudflareNs = async () => {
    setCfNsCheckLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_cloudflare_ns',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        if (data.data.nsVerified) {
          if (data.data.recordsCreated) {
            setSuccess(
              'Nameservers verified! All DNS records have been created automatically. Your domain is ready!'
            );
          } else {
            setSuccess('Nameservers verified! Some records may have failed - check below.');
          }
        } else {
          setSuccess(
            'Nameservers not yet verified. This can take up to 48 hours after updating at your registrar.'
          );
        }
      } else {
        setError(data.error || 'Failed to check nameserver status');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error checking Cloudflare NS:', err);
      setError('Failed to check nameserver status');
    } finally {
      setCfNsCheckLoading(false);
    }
  };

  const handleSwitchToManualDns = async () => {
    if (
      !confirm('Switch to manual DNS? You will need to add DNS records manually at your registrar.')
    ) {
      return;
    }

    setCfSetupLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'switch_to_manual_dns',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        setSuccess('Switched to manual DNS. Please add DNS records manually at your registrar.');
      } else {
        setError(data.error || 'Failed to switch to manual DNS');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error switching to manual DNS:', err);
      setError('Failed to switch to manual DNS');
    } finally {
      setCfSetupLoading(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!tenant) return;

    setBrandingSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/data/app/tenant', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_branding',
          ...branding,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setTenant(data.data);
        setSuccess('Branding settings saved!');
      } else {
        setError(data.error || 'Failed to save branding');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error saving branding:', err);
      setError('Failed to save branding');
    } finally {
      setBrandingSaving(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type (Cloudflare Images only supports these formats)
    const validTypes = ['image/png', 'image/svg+xml', 'image/jpeg', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, SVG, JPEG, or WebP file. ICO files are not supported.');
      return;
    }

    // Validate file size (max 500KB for favicon)
    if (file.size > 500 * 1024) {
      setError('Favicon file must be less than 500KB');
      return;
    }

    setFaviconUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('original', file);
      formData.append('category', 'logo');
      formData.append('relatedToType', 'expert');
      formData.append('relatedToId', expertId);

      const response = await fetch('/api/cloudflare/images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.originalUrl) {
        setBranding(prev => ({ ...prev, faviconUrl: data.data.originalUrl }));
        setSuccess('Favicon uploaded! Click "Save Branding" to apply.');
      } else {
        setError(data.error || 'Failed to upload favicon');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error uploading favicon:', err);
      setError('Failed to upload favicon');
    } finally {
      setFaviconUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const handleOgImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPEG, or WebP file for the OG image.');
      return;
    }

    // Validate file size (max 2MB for OG image)
    if (file.size > 2 * 1024 * 1024) {
      setError('OG image must be less than 2MB');
      return;
    }

    setOgImageUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('original', file);
      formData.append('category', 'banner');
      formData.append('relatedToType', 'expert');
      formData.append('relatedToId', expertId);

      const response = await fetch('/api/cloudflare/images/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.data?.originalUrl) {
        setBranding(prev => ({ ...prev, ogImage: data.data.originalUrl }));
        setSuccess('OG image uploaded! Click "Save Branding" to apply.');
      } else {
        setError(data.error || 'Failed to upload OG image');
      }
    } catch (err) {
      console.error('[DBG][domain-settings] Error uploading OG image:', err);
      setError('Failed to upload OG image');
    } finally {
      setOgImageUploading(false);
      e.target.value = '';
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
    const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(
      (d): d is string => !!d
    );
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
    return [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(
      (d): d is string => !!d
    );
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
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600">Loading domain settings...</div>
      </div>
    );
  }

  const verificationRecords = getVerificationRecords();

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Domain & Email Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Configure custom domains and email for your expert portal
          </p>

          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginTop: '20px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <button
              onClick={() => setActiveTab('domain')}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'domain' ? 'var(--color-primary)' : '#6b7280',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  activeTab === 'domain'
                    ? '2px solid var(--color-primary)'
                    : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              Domain
            </button>
            <button
              onClick={() => setActiveTab('email')}
              style={{
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '500',
                color: activeTab === 'email' ? 'var(--color-primary)' : '#6b7280',
                background: 'transparent',
                border: 'none',
                borderBottom:
                  activeTab === 'email'
                    ? '2px solid var(--color-primary)'
                    : '2px solid transparent',
                cursor: 'pointer',
                marginBottom: '-1px',
              }}
            >
              Email
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        <div className="max-w-3xl">
          {/* Messages */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
              {success}
            </div>
          )}

          {/* ===== DOMAIN TAB ===== */}
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

              {/* Cloudflare NS Setup - Show when tenant has Cloudflare DNS pending */}
              {tenant?.cloudflareDns?.zoneStatus === 'pending' && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    marginBottom: '24px',
                    border: '2px solid #f59e0b',
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
                    <span style={{ fontSize: '24px' }}>⚡</span>
                    <h2 style={{ fontSize: '18px', fontWeight: '600' }}>
                      Complete Cloudflare Setup
                    </h2>
                  </div>

                  <p style={{ color: '#666', marginBottom: '16px' }}>
                    Update your domain&apos;s nameservers at your registrar to the values below:
                  </p>

                  <div
                    style={{
                      background: '#fef3c7',
                      borderRadius: '8px',
                      padding: '16px',
                      marginBottom: '16px',
                    }}
                  >
                    {tenant.cloudflareDns.nameservers?.map((ns, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 0',
                          borderBottom:
                            i < (tenant.cloudflareDns?.nameservers?.length || 0) - 1
                              ? '1px solid #fcd34d'
                              : 'none',
                        }}
                      >
                        <span style={{ fontFamily: 'monospace', fontWeight: '500' }}>
                          NS {i + 1}: {ns}
                        </span>
                        <CopyableField label={`NS ${i + 1}`} value={ns} fieldId={`cf-ns-${i}`} />
                      </div>
                    ))}
                  </div>

                  <p style={{ fontSize: '13px', color: '#666', marginBottom: '16px' }}>
                    After updating nameservers at your registrar, click the button below to check
                    propagation. This can take a few minutes to 48 hours.
                  </p>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={handleCheckCloudflareNs}
                      disabled={cfNsCheckLoading}
                      style={{
                        padding: '12px 24px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: cfNsCheckLoading ? 'not-allowed' : 'pointer',
                        opacity: cfNsCheckLoading ? 0.7 : 1,
                      }}
                    >
                      {cfNsCheckLoading ? 'Checking...' : 'Check Nameserver Propagation'}
                    </button>
                    <button
                      onClick={handleSwitchToManualDns}
                      disabled={cfSetupLoading}
                      style={{
                        padding: '12px 24px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        cursor: cfSetupLoading ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Switch to Manual DNS
                    </button>
                  </div>
                </div>
              )}

              {/* Cloudflare Active Badge - Show when Cloudflare DNS is active */}
              {tenant?.cloudflareDns?.zoneStatus === 'active' && (
                <div
                  style={{
                    background: '#ecfdf5',
                    borderRadius: '12px',
                    padding: '16px 24px',
                    marginBottom: '24px',
                    border: '1px solid #10b981',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        background: '#10b981',
                        color: '#fff',
                        padding: '4px 12px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      Cloudflare Active
                    </span>
                    <span style={{ color: '#047857' }}>
                      DNS is managed automatically via Cloudflare
                    </span>
                  </div>
                  <button
                    onClick={handleSwitchToManualDns}
                    disabled={cfSetupLoading}
                    style={{
                      padding: '6px 12px',
                      background: '#fff',
                      color: '#374151',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: cfSetupLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Switch to Manual
                  </button>
                </div>
              )}

              {/* Existing Tenant */}
              {tenant && tenant.primaryDomain && (
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
                        <a
                          href="#dns-config"
                          style={{
                            padding: '4px 12px',
                            background: '#eef',
                            color: '#00a',
                            borderRadius: '4px',
                            fontSize: '12px',
                            textDecoration: 'none',
                          }}
                        >
                          Configure
                        </a>
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
                            <a
                              href="#dns-config"
                              style={{
                                padding: '4px 12px',
                                background: '#eef',
                                color: '#00a',
                                borderRadius: '4px',
                                fontSize: '12px',
                                textDecoration: 'none',
                              }}
                            >
                              Configure
                            </a>
                          )}
                          {/* Don't allow removing the default myyoga.guru subdomain */}
                          {!domain.endsWith('.myyoga.guru') && (
                            <button
                              onClick={() => handleRemoveDomainClick(domain)}
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
                          )}
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

                  {/* DNS Instructions - Only show if there are unverified domains and NOT using Cloudflare NS */}
                  {hasUnverifiedDomains() &&
                    tenant?.cloudflareDns?.zoneStatus !== 'active' &&
                    tenant?.cloudflareDns?.zoneStatus !== 'pending' && (
                      <div
                        id="dns-config"
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
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns: '80px 1fr',
                                    gap: '8px',
                                  }}
                                >
                                  <strong>Type:</strong>
                                  <span>{record.type}</span>
                                  <strong>Name:</strong>
                                  <CopyableField
                                    label="name"
                                    value={record.name}
                                    fieldId={`verify-name-${index}`}
                                  />
                                  <strong>Value:</strong>
                                  <CopyableField
                                    label="value"
                                    value={record.value}
                                    fieldId={`verify-value-${index}`}
                                  />
                                </div>
                              </div>
                            ))
                          ) : (
                            <div>
                              <div
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '80px 1fr',
                                  gap: '8px',
                                }}
                              >
                                <strong>Type:</strong>
                                <span>A</span>
                                <strong>Name:</strong>
                                <CopyableField label="name" value="@" fieldId="default-a-name" />
                                <strong>Value:</strong>
                                <CopyableField
                                  label="value"
                                  value="216.150.1.1"
                                  fieldId="default-a-value"
                                />
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
                                    gap: '8px',
                                  }}
                                >
                                  <strong>Type:</strong>
                                  <span>CNAME</span>
                                  <strong>Name:</strong>
                                  <CopyableField
                                    label="name"
                                    value="www"
                                    fieldId="default-cname-name"
                                  />
                                  <strong>Value:</strong>
                                  <CopyableField
                                    label="value"
                                    value="cname.vercel-dns.com"
                                    fieldId="default-cname-value"
                                  />
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
                            DNS changes typically take 1-10 minutes to propagate (up to 48 hours in
                            some cases). Click &quot;Verify DNS&quot; once you&apos;ve added the
                            records.
                          </div>
                        </div>

                        {/* Cloudflare NS Alternative */}
                        {getCustomDomain() && !tenant?.cloudflareDns && (
                          <div
                            style={{
                              marginTop: '20px',
                              padding: '16px',
                              background: '#f0f9ff',
                              borderRadius: '8px',
                              border: '1px solid #0ea5e9',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                              <span style={{ fontSize: '20px' }}>⚡</span>
                              <div style={{ flex: 1 }}>
                                <strong style={{ display: 'block', marginBottom: '4px' }}>
                                  Prefer a simpler setup?
                                </strong>
                                <p
                                  style={{ color: '#666', fontSize: '13px', marginBottom: '12px' }}
                                >
                                  Use Cloudflare Nameservers instead. Just change 2 NS records at
                                  your registrar, and we&apos;ll manage all DNS records
                                  automatically - including email setup.
                                </p>
                                <button
                                  onClick={() => handleSetupCloudflareNs(getCustomDomain()!)}
                                  disabled={cfSetupLoading}
                                  style={{
                                    padding: '8px 16px',
                                    background: '#0ea5e9',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    fontSize: '13px',
                                    fontWeight: '500',
                                    cursor: cfSetupLoading ? 'not-allowed' : 'pointer',
                                    opacity: cfSetupLoading ? 0.7 : 1,
                                  }}
                                >
                                  {cfSetupLoading ? 'Setting up...' : 'Use Cloudflare NS Instead'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                </>
              )}
            </>
          )}

          {/* ===== EMAIL TAB ===== */}
          {activeTab === 'email' && !tenant && (
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                Set Up Your Domain First
              </h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Add a custom domain in the Domain tab to unlock email features like custom domain
                email and forwarding.
              </p>
              <button
                onClick={() => setActiveTab('domain')}
                style={{
                  padding: '12px 24px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Go to Domain Settings
              </button>
            </div>
          )}

          {activeTab === 'email' && tenant && tenant.primaryDomain && (
            <>
              {/* Default Email Section */}
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
                  Your Email
                </h2>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    background: '#f8f8f8',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '20px',
                      }}
                    >
                      ✉️
                    </span>
                    <div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#333',
                        }}
                      >
                        {expertId}@myyoga.guru
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        Your default email address
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/srv/${expertId}/inbox`}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '14px',
                      fontWeight: '500',
                      textDecoration: 'none',
                    }}
                  >
                    Go to Inbox
                  </Link>
                </div>
              </div>

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
                                    paddingBottom: index < emailDnsRecords.length - 1 ? '16px' : 0,
                                    borderBottom:
                                      index < emailDnsRecords.length - 1
                                        ? '1px solid #ddd'
                                        : 'none',
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
                                      gap: '8px',
                                      fontFamily: 'monospace',
                                      fontSize: '12px',
                                    }}
                                  >
                                    <strong>Type:</strong>
                                    <span>{record.type}</span>
                                    <strong>Name:</strong>
                                    <CopyableField
                                      label="name"
                                      value={record.name}
                                      fieldId={`email-name-${index}`}
                                    />
                                    <strong>Value:</strong>
                                    <CopyableField
                                      label="value"
                                      value={`${record.priority ? `${record.priority} ` : ''}${record.value}`}
                                      fieldId={`email-value-${index}`}
                                    />
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
            </>
          )}

          {/* ===== DOMAIN TAB - Custom Branding ===== */}
          {activeTab === 'domain' && tenant && tenant.primaryDomain && (
            <>
              {/* Custom Branding - Only show for custom domains */}
              {getCustomDomain() && (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '24px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                    Custom Domain Branding
                  </h2>
                  <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    Customize how your site appears when visitors access it via your custom domain.
                    These settings apply to <strong>{getCustomDomain()}</strong>.
                  </p>

                  {/* Favicon Upload */}
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}
                      htmlFor="faviconUpload"
                    >
                      Favicon
                    </label>

                    {/* Current Favicon Preview */}
                    {branding.faviconUrl && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '12px',
                          padding: '12px',
                          background: '#f8f8f8',
                          borderRadius: '8px',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={branding.faviconUrl}
                          alt="Current favicon"
                          style={{
                            width: '32px',
                            height: '32px',
                            objectFit: 'contain',
                            background: '#fff',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                          }}
                        />
                        <span style={{ fontSize: '13px', color: '#666', flex: 1 }}>
                          Current favicon
                        </span>
                        <button
                          onClick={() => setBranding({ ...branding, faviconUrl: '' })}
                          style={{
                            padding: '4px 8px',
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
                    )}

                    {/* Upload Button */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          background: faviconUploading ? '#ccc' : '#f0f0f0',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px',
                          cursor: faviconUploading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          id="faviconUpload"
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg,.webp,image/png,image/svg+xml,image/jpeg,image/webp"
                          onChange={handleFaviconUpload}
                          disabled={faviconUploading}
                          style={{ display: 'none' }}
                        />
                        {faviconUploading ? 'Uploading...' : 'Upload Favicon'}
                      </label>
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        PNG, SVG, or JPEG (max 500KB)
                      </span>
                    </div>

                    {/* Or enter URL manually */}
                    <div style={{ marginTop: '12px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '4px',
                        }}
                        htmlFor="faviconUrl"
                      >
                        Or enter URL manually:
                      </label>
                      <input
                        id="faviconUrl"
                        type="url"
                        value={branding.faviconUrl || ''}
                        onChange={e => setBranding({ ...branding, faviconUrl: e.target.value })}
                        placeholder="https://example.com/favicon.ico"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <p style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>
                      The icon shown in browser tabs. Use PNG or SVG format. Recommended size:
                      32x32px or 64x64px. ICO files are not supported.
                    </p>
                  </div>

                  {/* Site Title */}
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}
                      htmlFor="siteTitle"
                    >
                      Site Title
                    </label>
                    <input
                      id="siteTitle"
                      type="text"
                      value={branding.siteTitle || ''}
                      onChange={e => setBranding({ ...branding, siteTitle: e.target.value })}
                      placeholder={tenant.name || 'My Yoga Studio'}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                    <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                      Shown in browser tabs and search results.
                    </p>
                  </div>

                  {/* Site Description */}
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}
                      htmlFor="siteDescription"
                    >
                      Site Description
                    </label>
                    <textarea
                      id="siteDescription"
                      value={branding.siteDescription || ''}
                      onChange={e => setBranding({ ...branding, siteDescription: e.target.value })}
                      placeholder="Expert-led yoga courses for every level..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '14px',
                        resize: 'vertical',
                      }}
                    />
                    <p style={{ color: '#999', fontSize: '12px', marginTop: '4px' }}>
                      Meta description for search engines (recommended: 150-160 characters).
                    </p>
                  </div>

                  {/* OG Image Upload */}
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{ display: 'block', fontWeight: '500', marginBottom: '8px' }}
                      htmlFor="ogImageUpload"
                    >
                      Social Share Image (OG Image)
                    </label>

                    {/* Current OG Image Preview */}
                    {branding.ogImage && (
                      <div
                        style={{
                          marginBottom: '12px',
                          padding: '12px',
                          background: '#f8f8f8',
                          borderRadius: '8px',
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={branding.ogImage}
                          alt="Current OG image"
                          style={{
                            width: '100%',
                            maxWidth: '300px',
                            height: 'auto',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                          }}
                        />
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginTop: '8px',
                          }}
                        >
                          <span style={{ fontSize: '13px', color: '#666' }}>Current OG image</span>
                          <button
                            onClick={() => setBranding({ ...branding, ogImage: '' })}
                            style={{
                              padding: '4px 8px',
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
                    )}

                    {/* Upload Button */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 16px',
                          background: ogImageUploading ? '#ccc' : '#f0f0f0',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          fontSize: '14px',
                          cursor: ogImageUploading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          id="ogImageUpload"
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                          onChange={handleOgImageUpload}
                          disabled={ogImageUploading}
                          style={{ display: 'none' }}
                        />
                        {ogImageUploading ? 'Uploading...' : 'Upload Image'}
                      </label>
                      <span style={{ color: '#999', fontSize: '12px' }}>
                        PNG, JPEG, or WebP (max 2MB)
                      </span>
                    </div>

                    {/* Or enter URL manually */}
                    <div style={{ marginTop: '12px' }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '12px',
                          color: '#666',
                          marginBottom: '4px',
                        }}
                        htmlFor="ogImage"
                      >
                        Or enter URL manually:
                      </label>
                      <input
                        id="ogImage"
                        type="url"
                        value={branding.ogImage || ''}
                        onChange={e => setBranding({ ...branding, ogImage: e.target.value })}
                        placeholder="https://example.com/og-image.jpg"
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '6px',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                    <p style={{ color: '#999', fontSize: '12px', marginTop: '8px' }}>
                      Image shown when sharing on social media. Recommended size: 1200x630px.
                    </p>
                  </div>

                  {/* Save Button */}
                  <button
                    onClick={handleSaveBranding}
                    disabled={brandingSaving}
                    style={{
                      padding: '12px 24px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: brandingSaving ? 'not-allowed' : 'pointer',
                      opacity: brandingSaving ? 0.7 : 1,
                    }}
                  >
                    {brandingSaving ? 'Saving...' : 'Save Branding'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Remove Domain Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!domainToRemove}
        onClose={() => setDomainToRemove(null)}
        message={`Are you sure you want to remove ${domainToRemove}?`}
        type="warning"
        onConfirm={handleRemoveDomainConfirm}
        confirmText="Remove"
        cancelText="Cancel"
      />
    </>
  );
}
