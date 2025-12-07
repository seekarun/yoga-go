'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    fetchEmailSettings();
  }, [fetchEmailSettings]);

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

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading email settings...</div>
      </div>
    );
  }

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
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginTop: '16px' }}>Email Settings</h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Manage your expert email address and forwarding settings.
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
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Your Expert Email Address
          </h2>
          <p style={{ color: '#666', marginBottom: '16px' }}>
            This is your dedicated expert email address. Payment confirmations and other
            transactional emails will be sent from this address when customers purchase on your
            subdomain.
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
                  Payment confirmations from your subdomain (e.g., {expertId}.myyoga.guru) are sent
                  from your expert email address.
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
                  Emails sent to your expert address are automatically forwarded to your personal
                  email.
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
  );
}
