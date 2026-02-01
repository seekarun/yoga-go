'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Tenant } from '@/types';

interface EmailSettings {
  platformEmail: string;
  forwardingEmail: string | null;
  emailForwardingEnabled: boolean;
}

export default function EmailSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [forwardingEmail, setForwardingEmail] = useState('');
  const [emailForwardingEnabled, setEmailForwardingEnabled] = useState(true);

  // Tenant data for BYOD email
  const [tenant, setTenant] = useState<Tenant | null>(null);

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      console.log('[DBG][email-settings] User doesnt own this profile');
      router.push(`/srv/${user.expertProfile}/settings/email`);
    }
  }, [user, expertId, router]);

  const fetchEmailSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/data/app/expert/email');
      const data = await response.json();

      if (data.success) {
        setEmailSettings(data.data);
        setForwardingEmail(data.data.forwardingEmail || '');
        setEmailForwardingEnabled(data.data.emailForwardingEnabled);
      } else {
        setError(data.error || 'Failed to load email settings');
      }
    } catch (err) {
      console.error('[DBG][email-settings] Error fetching settings:', err);
      setError('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTenantData = useCallback(async () => {
    try {
      const response = await fetch('/data/app/tenant');
      const data = await response.json();
      if (data.success && data.data) {
        setTenant(data.data);
      }
    } catch (err) {
      console.error('[DBG][email-settings] Error fetching tenant:', err);
      // Don't show error - tenant is optional
    }
  }, []);

  useEffect(() => {
    fetchEmailSettings();
    fetchTenantData();
  }, [fetchEmailSettings, fetchTenantData]);

  const handleSave = async () => {
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
        setSuccess('Email settings updated successfully!');
      } else {
        setError(data.error || 'Failed to update settings');
      }
    } catch (err) {
      console.error('[DBG][email-settings] Error saving settings:', err);
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

  // Helper to check if BYOD email is configured and verified
  const hasByodEmail =
    tenant?.emailConfig?.sesVerificationStatus === 'verified' && tenant?.emailConfig?.domainEmail;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600">Loading email settings...</div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Email Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your expert email address and forwarding settings
          </p>
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

          {/* BYOD Custom Domain Email (if configured) */}
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
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}
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
                Emails to customers on your custom domain ({tenant?.primaryDomain}) will be sent
                from this address. This provides a professional, branded experience.
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

              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  fontSize: '13px',
                  color: '#166534',
                }}
              >
                <strong>Status:</strong> Verified and active. Transactional emails on your custom
                domain will be sent from this address.
              </div>

              <div style={{ marginTop: '12px' }}>
                <Link
                  href={`/srv/${expertId}/settings/domain`}
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontSize: '13px',
                  }}
                >
                  Manage custom domain settings &rarr;
                </Link>
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
                ? 'This is your platform email address. It will be used for emails on your subdomain (e.g., ' +
                  expertId +
                  '.myyoga.guru) or as a fallback.'
                : 'This is your dedicated expert email address. Payment confirmations and other transactional emails will be sent from this address when customers purchase on your subdomain.'}
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

            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                background: '#f0f9ff',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#0369a1',
              }}
            >
              <strong>Note:</strong> You can share this email address publicly. Incoming emails will
              be forwarded to your personal email if forwarding is enabled below.
            </div>
          </div>

          {/* Set Up Custom Domain Email (if not configured) */}
          {!hasByodEmail && tenant?.primaryDomain && tenant?.status === 'active' && (
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
                You have a custom domain ({tenant.primaryDomain}) configured. You can set up email
                to send transactional emails from your own domain for a more professional
                experience.
              </p>
              <Link
                href={`/srv/${expertId}/settings/domain`}
                style={{
                  display: 'inline-block',
                  padding: '10px 20px',
                  background: '#eab308',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  fontSize: '14px',
                }}
              >
                Set Up Domain Email
              </Link>
            </div>
          )}

          {/* Email Forwarding */}
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
              Email Forwarding
            </h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              When someone sends an email to your expert address, it will be forwarded to your
              personal email. This lets you receive messages from students and customers.
            </p>

            {/* Enable/Disable Toggle */}
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
              <p style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                Enter the email address where you want to receive forwarded messages.
              </p>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSave}
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

          {/* How It Works */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
              How It Works
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  1
                </div>
                <div>
                  <strong>Outgoing Emails</strong>
                  <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                    {hasByodEmail
                      ? `Payment confirmations from your custom domain (${tenant?.primaryDomain}) are sent from ${tenant?.emailConfig?.domainEmail}. On your subdomain (${expertId}.myyoga.guru), emails are sent from ${expertId}@myyoga.guru.`
                      : `Payment confirmations from your subdomain (e.g., ${expertId}.myyoga.guru) are sent from your expert email address.`}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  2
                </div>
                <div>
                  <strong>Incoming Emails</strong>
                  <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                    {hasByodEmail
                      ? `Emails sent to both ${tenant?.emailConfig?.domainEmail} and ${expertId}@myyoga.guru are forwarded to your personal email.`
                      : 'Emails sent to your expert address are automatically forwarded to your personal email.'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  3
                </div>
                <div>
                  <strong>Reply to Students</strong>
                  <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                    When you reply from your personal email, the student will see the reply coming
                    from your regular email address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
