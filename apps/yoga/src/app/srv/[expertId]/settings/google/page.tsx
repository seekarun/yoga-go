'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationOverlay from '@/components/NotificationOverlay';

interface GoogleConnectionStatus {
  connected: boolean;
  email?: string;
}

export default function GoogleSettingsPage() {
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

  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus | null>(null);

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      console.log('[DBG][google-settings] User doesnt own this profile');
      router.push(`/srv/${user.expertProfile}/settings/google`);
    }
  }, [user, expertId, router]);

  // Check for success query param from OAuth callback
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setSuccess('Google account connected successfully!');
      // Clean up URL
      router.replace(`/srv/${expertId}/settings/google`);
    }
    if (searchParams.get('error')) {
      setError(searchParams.get('error') || 'Failed to connect Google account');
      router.replace(`/srv/${expertId}/settings/google`);
    }
  }, [searchParams, expertId, router]);

  const fetchConnectionStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/google-calendar/status');
      const data = await response.json();

      if (data.success) {
        setConnectionStatus(data.data);
      } else {
        setError(data.error || 'Failed to load Google connection status');
      }
    } catch (err) {
      console.error('[DBG][google-settings] Error fetching status:', err);
      setError('Failed to load Google connection status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnectionStatus();
  }, [fetchConnectionStatus]);

  const handleConnect = () => {
    // Redirect to Google OAuth flow
    window.location.href = '/api/auth/google-calendar/connect';
  };

  const handleDisconnectClick = () => {
    setShowDisconnectConfirm(true);
  };

  const handleDisconnectConfirm = async () => {
    setDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/google-calendar/status', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus({ connected: false });
        setSuccess('Google account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect Google account');
      }
    } catch (err) {
      console.error('[DBG][google-settings] Error disconnecting:', err);
      setError('Failed to disconnect Google account');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading Google settings...</div>
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
            Google Calendar Integration
          </h1>
          <p style={{ color: '#666', marginTop: '8px' }}>
            Connect your Google account to automatically create Google Meet links for your webinars.
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
            border: connectionStatus?.connected ? '2px solid #10b981' : '1px solid #ddd',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            {/* Google Icon */}
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: connectionStatus?.connected ? '#f0fdf4' : '#f8f8f8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            </div>

            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Google Account</h2>
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
                    background: connectionStatus?.connected ? '#dcfce7' : '#fee',
                    color: connectionStatus?.connected ? '#166534' : '#c00',
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
                  background: '#f0fdf4',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <div style={{ fontSize: '13px', color: '#166534', marginBottom: '4px' }}>
                  Connected Account
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '16px',
                    fontWeight: '500',
                    color: '#166534',
                  }}
                >
                  {connectionStatus.email}
                </div>
              </div>

              <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                Your Google account is connected. When you create webinar sessions, Google Calendar
                events with Meet links will be automatically created.
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
                {disconnecting ? 'Disconnecting...' : 'Disconnect Google Account'}
              </button>
            </>
          ) : (
            <>
              {/* Not Connected State */}
              <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                Connect your Google account to enable Google Meet integration for your webinars.
                This allows you to:
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
                  Automatically create Google Calendar events for each session
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Generate Google Meet links that participants can join
                </li>
                <li style={{ marginBottom: '8px' }}>
                  Send calendar invites to registered participants
                </li>
              </ul>

              <button
                onClick={handleConnect}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 24px',
                  background: '#fff',
                  color: '#333',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '15px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Connect with Google
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
                <strong>Connect Your Account</strong>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  Sign in with Google and grant permission to access your calendar.
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
                <strong>Create Webinar Sessions</strong>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  When you create sessions for your webinar, Google Calendar events with Meet links
                  are automatically generated.
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
                <strong>Participants Join</strong>
                <p style={{ color: '#666', fontSize: '14px', marginTop: '4px' }}>
                  Registered participants can join the session using the Google Meet link on their
                  webinar page.
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
            When you connect your Google account, we request the following permissions:
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
                  background: '#e8f0fe',
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
                  stroke="#4285f4"
                  strokeWidth="2"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div>
                <strong style={{ fontSize: '14px' }}>Calendar Access</strong>
                <p style={{ color: '#666', fontSize: '13px', marginTop: '2px' }}>
                  Create and manage calendar events for your webinar sessions
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
                  background: '#e8f0fe',
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
                  stroke="#4285f4"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l3 3" />
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
            We only use these permissions to create calendar events with Meet links. We do not read
            or modify any other data in your Google account.
          </p>
        </div>
      </div>

      {/* Disconnect Confirmation Overlay */}
      <NotificationOverlay
        isOpen={showDisconnectConfirm}
        onClose={() => setShowDisconnectConfirm(false)}
        message="Are you sure you want to disconnect your Google account?"
        type="warning"
        onConfirm={handleDisconnectConfirm}
        confirmText="Disconnect"
        cancelText="Cancel"
      />
    </div>
  );
}
