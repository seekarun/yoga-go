'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationOverlay from '@/components/NotificationOverlay';

type DisconnectType = 'google' | 'zoom' | null;

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const expertId = params.expertId as string;

  // Shared state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState<DisconnectType>(null);

  // Google Calendar state
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleDisconnecting, setGoogleDisconnecting] = useState(false);
  const [googleConnectionStatus, setGoogleConnectionStatus] = useState<{
    connected: boolean;
    email?: string;
  } | null>(null);

  // Zoom state
  const [zoomLoading, setZoomLoading] = useState(true);
  const [zoomDisconnecting, setZoomDisconnecting] = useState(false);
  const [zoomConnectionStatus, setZoomConnectionStatus] = useState<{
    connected: boolean;
    email?: string;
  } | null>(null);

  // Check if user owns this expert profile
  useEffect(() => {
    if (user && user.expertProfile !== expertId) {
      router.push(`/srv/${user.expertProfile}/settings`);
    }
  }, [user, expertId, router]);

  const fetchGoogleStatus = useCallback(async () => {
    try {
      setGoogleLoading(true);
      const response = await fetch('/api/auth/google-calendar/status');
      const data = await response.json();

      if (data.success) {
        setGoogleConnectionStatus(data.data);
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching Google status:', err);
    } finally {
      setGoogleLoading(false);
    }
  }, []);

  const fetchZoomStatus = useCallback(async () => {
    try {
      setZoomLoading(true);
      const response = await fetch('/api/auth/zoom/status');
      const data = await response.json();

      if (data.success) {
        setZoomConnectionStatus(data.data);
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching Zoom status:', err);
    } finally {
      setZoomLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
    fetchZoomStatus();
  }, [fetchGoogleStatus, fetchZoomStatus]);

  // Google handlers
  const handleGoogleConnect = () => {
    window.location.href = '/api/auth/google-calendar/connect';
  };

  const handleGoogleDisconnectClick = () => {
    setConfirmDisconnect('google');
  };

  const handleGoogleDisconnectConfirm = async () => {
    setGoogleDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/google-calendar/status', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setGoogleConnectionStatus({ connected: false });
        setSuccess('Google account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect Google account');
      }
    } catch (err) {
      console.error('[DBG][settings] Error disconnecting Google:', err);
      setError('Failed to disconnect Google account');
    } finally {
      setGoogleDisconnecting(false);
    }
  };

  // Zoom handlers
  const handleZoomConnect = () => {
    window.location.href = '/api/auth/zoom/connect';
  };

  const handleZoomDisconnectClick = () => {
    setConfirmDisconnect('zoom');
  };

  const handleZoomDisconnectConfirm = async () => {
    setZoomDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/auth/zoom/status', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setZoomConnectionStatus({ connected: false });
        setSuccess('Zoom account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect Zoom account');
      }
    } catch (err) {
      console.error('[DBG][settings] Error disconnecting Zoom:', err);
      setError('Failed to disconnect Zoom account');
    } finally {
      setZoomDisconnecting(false);
    }
  };

  const handleDisconnectConfirm = () => {
    if (confirmDisconnect === 'google') {
      handleGoogleDisconnectConfirm();
    } else if (confirmDisconnect === 'zoom') {
      handleZoomDisconnectConfirm();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your integrations and account settings
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

          {/* Google Calendar Section */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              border: googleConnectionStatus?.connected ? '2px solid #10b981' : '1px solid #ddd',
            }}
          >
            {googleLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#666' }}>Loading Google settings...</div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  {/* Google Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: googleConnectionStatus?.connected ? '#f0fdf4' : '#f8f8f8',
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
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Google Calendar
                    </h2>
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
                          background: googleConnectionStatus?.connected ? '#dcfce7' : '#fee',
                          color: googleConnectionStatus?.connected ? '#166534' : '#c00',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {googleConnectionStatus?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                {googleConnectionStatus?.connected ? (
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
                        {googleConnectionStatus.email}
                      </div>
                    </div>

                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                      Your Google account is connected. When you create webinar sessions, Google
                      Calendar events with Meet links will be automatically created.
                    </p>

                    <button
                      onClick={handleGoogleDisconnectClick}
                      disabled={googleDisconnecting}
                      style={{
                        padding: '10px 20px',
                        background: '#fee',
                        color: '#c00',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: googleDisconnecting ? 'not-allowed' : 'pointer',
                        opacity: googleDisconnecting ? 0.7 : 1,
                      }}
                    >
                      {googleDisconnecting ? 'Disconnecting...' : 'Disconnect Google Account'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Not Connected State */}
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                      Connect your Google account to enable Google Meet integration for your
                      webinars. This allows you to:
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
                      onClick={handleGoogleConnect}
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
              </>
            )}
          </div>

          {/* Zoom Section */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginTop: '24px',
              border: zoomConnectionStatus?.connected ? '2px solid #2D8CFF' : '1px solid #ddd',
            }}
          >
            {zoomLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#666' }}>Loading Zoom settings...</div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '16px',
                  }}
                >
                  {/* Zoom Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: zoomConnectionStatus?.connected ? '#e8f4ff' : '#f8f8f8',
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
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Zoom</h2>
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
                          background: zoomConnectionStatus?.connected ? '#e8f4ff' : '#fee',
                          color: zoomConnectionStatus?.connected ? '#0b5cba' : '#c00',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {zoomConnectionStatus?.connected ? 'Connected' : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                {zoomConnectionStatus?.connected ? (
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
                        {zoomConnectionStatus.email}
                      </div>
                    </div>

                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                      Your Zoom account is connected. When you create webinar sessions with Zoom as
                      the platform, Zoom meeting links will be automatically created.
                    </p>

                    <button
                      onClick={handleZoomDisconnectClick}
                      disabled={zoomDisconnecting}
                      style={{
                        padding: '10px 20px',
                        background: '#fee',
                        color: '#c00',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: zoomDisconnecting ? 'not-allowed' : 'pointer',
                        opacity: zoomDisconnecting ? 0.7 : 1,
                      }}
                    >
                      {zoomDisconnecting ? 'Disconnecting...' : 'Disconnect Zoom Account'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Not Connected State */}
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                      Connect your Zoom account to enable Zoom integration for your webinars. This
                      allows you to:
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
                      onClick={handleZoomConnect}
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* Disconnect Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!confirmDisconnect}
        onClose={() => setConfirmDisconnect(null)}
        message={`Are you sure you want to disconnect your ${confirmDisconnect === 'google' ? 'Google' : 'Zoom'} account?`}
        type="warning"
        onConfirm={handleDisconnectConfirm}
        confirmText="Disconnect"
        cancelText="Cancel"
      />
    </>
  );
}
