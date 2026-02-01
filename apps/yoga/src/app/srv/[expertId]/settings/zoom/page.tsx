'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationOverlay from '@/components/NotificationOverlay';

interface ZoomConnectionStatus {
  connected: boolean;
  email?: string;
}

export default function ZoomSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  const [connectionStatus, setConnectionStatus] = useState<ZoomConnectionStatus | null>(null);

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      console.log('[DBG][zoom-settings] User doesnt own this profile');
      router.push(`/srv/${user.expertProfile}/settings/zoom`);
    }
  }, [user, expertId, router]);

  // Check for success query param from OAuth callback
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setSuccess('Zoom account connected successfully!');
      // Clean up URL
      router.replace(`/srv/${expertId}/settings/zoom`);
    }
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Failed to connect Zoom account');
      router.replace(`/srv/${expertId}/settings/zoom`);
    }
  }, [searchParams, expertId, router]);

  const fetchConnectionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/zoom/status');
      const data = await response.json();

      if (data.success) {
        setConnectionStatus(data.data);
      } else {
        setError(data.error || 'Failed to load Zoom connection status');
      }
    } catch (err) {
      console.error('[DBG][zoom-settings] Error fetching status:', err);
      setError('Failed to load Zoom connection status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  const handleConnect = () => {
    // Redirect to Zoom OAuth flow
    window.location.href = '/api/auth/zoom/connect';
  };

  const handleDisconnectClick = () => {
    setShowDisconnectConfirm(true);
  };

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/zoom/status', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus({ connected: false });
        setSuccess('Zoom account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect Zoom account');
      }
    } catch (err) {
      console.error('[DBG][zoom-settings] Error disconnecting:', err);
      setError('Failed to disconnect Zoom account');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading Zoom settings...</div>
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
          <h1 style={{ fontSize: '28px', fontWeight: '600', marginTop: '16px' }}>
            Zoom Integration
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Connect your Zoom account to automatically create Zoom meeting links for your webinars.
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

        {/* Connection Status Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            marginBottom: '24px',
            border: connectionStatus?.connected ? '2px solid #2D8CFF' : '1px solid #ddd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {/* Zoom Icon */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: connectionStatus?.connected ? '#e8f4ff' : '#f8f8f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="#2D8CFF">
                <path d="M4.5 5.25a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-3.75l4.5 3.75V6l-4.5 3.75V6a.75.75 0 0 0-.75-.75H4.5z" />
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Zoom Account</h2>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px',
                }}
              >
                <span
                  style={{
                    padding: '2px 8px',
                    background: connectionStatus?.connected ? '#e8f4ff' : '#fee',
                    color: connectionStatus?.connected ? '#0b5cba' : '#c00',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  {connectionStatus?.connected ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>
          </div>

          {connectionStatus?.connected ? (
            <>
              {/* Connected State */}
              <div
                style={{
                  padding: '16px',
                  background: '#e8f4ff',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '13px', color: '#0b5cba', marginBottom: '4px' }}>
                  Connected Account
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#0b5cba',
                  }}
                >
                  {connectionStatus.email}
                </div>
              </div>

              <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                Your Zoom account is connected. When you create webinar sessions with Zoom as the
                platform, Zoom meeting links will be automatically created.
              </p>

              <button
                onClick={handleDisconnectClick}
                disabled={disconnecting}
                style={{
                  padding: '10px 20px',
                  background: '#fee',
                  color: '#c00',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: disconnecting ? 'not-allowed' : 'pointer',
                  opacity: disconnecting ? 0.7 : 1,
                }}
              >
                {disconnecting ? 'Disconnecting...' : 'Disconnect Zoom Account'}
              </button>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                Connect your Zoom account to enable Zoom integration for your webinars. This allows
                you to:
              </p>

              <ul
                style={{
                  margin: '0 0 20px 0',
                  padding: '0 0 0 20px',
                  color: '#666',
                  fontSize: '14px',
                }}
              >
                <li style={{ marginBottom: '8px' }}>
                  Automatically create Zoom meetings for each session
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Generate secure meeting links with passwords
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Use Zoom&apos;s waiting room and other security features
                </li>
              </ul>

              <button
                onClick={handleConnect}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: '#2D8CFF',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M4.5 5.25a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-3.75l4.5 3.75V6l-4.5 3.75V6a.75.75 0 0 0-.75-.75H4.5z" />
                </svg>
                Connect with Zoom
              </button>
            </>
          )}
        </div>

        {/* How It Works */}
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
            How It Works
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#2D8CFF',
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
                <strong>Connect Your Account</strong>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  Sign in with Zoom and grant permission to create meetings.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#2D8CFF',
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
                <strong>Create Webinar Sessions</strong>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  When you select Zoom as the platform and create sessions, Zoom meetings are
                  automatically generated with secure links.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#2D8CFF',
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
                <strong>Participants Join</strong>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  Registered participants can join the session using the Zoom link on their webinar
                  page.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions Info */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
            Permissions Required
          </h2>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
            When you connect your Zoom account, we request the following permissions:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8f8f8',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  background: '#e8f4ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D8CFF"
                  strokeWidth="2"
                >
                  <path d="M4.5 5.25a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-3.75l4.5 3.75V6l-4.5 3.75V6a.75.75 0 0 0-.75-.75H4.5z" />
                </svg>
              </div>
              <div>
                <strong style={{ fontSize: '14px' }}>Meeting Access</strong>
                <p style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>
                  Create and manage Zoom meetings for your webinar sessions
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                gap: '12px',
                padding: '12px 16px',
                background: '#f8f8f8',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  background: '#e8f4ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#2D8CFF"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2" />
                </svg>
              </div>
              <div>
                <strong style={{ fontSize: '14px' }}>Profile Information</strong>
                <p style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>
                  View your email address to display which account is connected
                </p>
              </div>
            </div>
          </div>

          <p style={{ color: '#999', fontSize: '12px', marginTop: '16px' }}>
            We only use these permissions to create Zoom meetings. We do not access recordings,
            participants, or any other data in your Zoom account.
          </p>
        </div>
      </div>

      {/* Disconnect Confirmation Overlay */}
      <NotificationOverlay
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        message="Are you sure you want to disconnect your Zoom account?"
        type="warning"
        onConfirm={handleDisconnectConfirm}
        confirmText="Disconnect"
        cancelText="Cancel"
      />
    </div>
  );
}
