'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationOverlay from '@/components/NotificationOverlay';

import type { StripeConnectDetails } from '@/types';

type DisconnectType = 'google' | 'zoom' | null;

function SettingsContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
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

  // Stripe Connect state
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConnectionStatus, setStripeConnectionStatus] = useState<StripeConnectDetails | null>(
    null
  );

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

  const fetchStripeStatus = useCallback(async () => {
    try {
      setStripeLoading(true);
      const response = await fetch('/api/stripe/connect/status');
      const data = await response.json();

      if (data.success) {
        setStripeConnectionStatus(data.data);
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching Stripe status:', err);
    } finally {
      setStripeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
    fetchZoomStatus();
    fetchStripeStatus();
  }, [fetchGoogleStatus, fetchZoomStatus, fetchStripeStatus]);

  // Handle Stripe callback query params
  useEffect(() => {
    const stripeParam = searchParams.get('stripe');
    if (stripeParam) {
      console.log('[DBG][settings] Stripe callback param:', stripeParam);
      // Refetch status after callback redirect
      fetchStripeStatus();

      if (stripeParam === 'connected') {
        setSuccess('Stripe account connected successfully! You can now receive payments.');
      } else if (stripeParam === 'pending') {
        setSuccess('Stripe setup started. Complete the onboarding to receive payments.');
      } else if (stripeParam === 'error') {
        setError('There was an issue connecting your Stripe account. Please try again.');
      }

      // Clear the query param from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }
  }, [searchParams, fetchStripeStatus]);

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

  // Stripe handlers
  const handleStripeConnect = async () => {
    setStripeConnecting(true);
    setError('');

    try {
      const response = await fetch('/api/stripe/connect/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: 'US' }),
      });

      const data = await response.json();

      if (data.success && data.data.onboardingUrl) {
        // Redirect to Stripe onboarding
        window.location.href = data.data.onboardingUrl;
      } else {
        setError(data.error || 'Failed to create Stripe account');
        setStripeConnecting(false);
      }
    } catch (err) {
      console.error('[DBG][settings] Error connecting Stripe:', err);
      setError('Failed to connect Stripe account');
      setStripeConnecting(false);
    }
  };

  const handleOpenStripeDashboard = async () => {
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success && data.data.url) {
        window.open(data.data.url, '_blank');
      } else {
        setError(data.error || 'Failed to open Stripe dashboard');
      }
    } catch (err) {
      console.error('[DBG][settings] Error opening Stripe dashboard:', err);
      setError('Failed to open Stripe dashboard');
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connect third-party services to enhance your platform
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

          {/* Stripe Connect Section - Payments */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginTop: '24px',
              border:
                stripeConnectionStatus?.status === 'active'
                  ? '2px solid #635bff'
                  : '1px solid #ddd',
            }}
          >
            {stripeLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#666' }}>Loading payment settings...</div>
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
                  {/* Stripe Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background:
                        stripeConnectionStatus?.status === 'active' ? '#f0f0ff' : '#f8f8f8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="#635bff">
                      <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                    </svg>
                  </div>

                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Payments (Stripe)
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
                          background:
                            stripeConnectionStatus?.status === 'active'
                              ? '#f0f0ff'
                              : stripeConnectionStatus?.status === 'pending' ||
                                  stripeConnectionStatus?.status === 'disabled'
                                ? '#fff7e6'
                                : stripeConnectionStatus?.status === 'restricted'
                                  ? '#fee'
                                  : '#f5f5f5',
                          color:
                            stripeConnectionStatus?.status === 'active'
                              ? '#635bff'
                              : stripeConnectionStatus?.status === 'pending' ||
                                  stripeConnectionStatus?.status === 'disabled'
                                ? '#d46b08'
                                : stripeConnectionStatus?.status === 'restricted'
                                  ? '#c00'
                                  : '#666',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {stripeConnectionStatus?.status === 'active'
                          ? 'Connected'
                          : stripeConnectionStatus?.status === 'pending'
                            ? 'Pending Setup'
                            : stripeConnectionStatus?.status === 'restricted'
                              ? 'Action Required'
                              : stripeConnectionStatus?.status === 'disabled'
                                ? 'Setup Incomplete'
                                : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                {stripeConnectionStatus?.status === 'active' ? (
                  <>
                    {/* Connected State */}
                    <div
                      style={{
                        padding: '16px',
                        background: '#f0f0ff',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ fontSize: '13px', color: '#635bff', marginBottom: '4px' }}>
                        Connected Account
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '16px',
                          fontWeight: '500',
                          color: '#635bff',
                        }}
                      >
                        {stripeConnectionStatus.email || stripeConnectionStatus.accountId}
                      </div>
                    </div>

                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                      Your Stripe account is connected. When learners purchase your courses, you
                      will receive 95% of the payment instantly. The platform retains 5% as a
                      service fee.
                    </p>

                    <button
                      onClick={handleOpenStripeDashboard}
                      style={{
                        padding: '10px 20px',
                        background: '#635bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Open Stripe Dashboard
                    </button>
                  </>
                ) : stripeConnectionStatus?.status === 'pending' ||
                  stripeConnectionStatus?.status === 'restricted' ||
                  stripeConnectionStatus?.status === 'disabled' ? (
                  <>
                    {/* Pending/Incomplete State */}
                    <div
                      style={{
                        padding: '16px',
                        background: '#fff7e6',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <div style={{ fontSize: '14px', color: '#d46b08' }}>
                        Your Stripe account setup is incomplete. Please complete the onboarding to
                        receive payments.
                      </div>
                    </div>

                    <button
                      onClick={handleStripeConnect}
                      disabled={stripeConnecting}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 24px',
                        background: '#635bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: stripeConnecting ? 'not-allowed' : 'pointer',
                        opacity: stripeConnecting ? 0.7 : 1,
                      }}
                    >
                      {stripeConnecting ? 'Redirecting...' : 'Complete Stripe Setup'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Not Connected State */}
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                      Connect your Stripe account to receive payments for your courses. This is
                      required to publish paid courses.
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
                        Receive 95% of course payments instantly
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        Automatic payouts to your bank account
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        View earnings and manage payouts in Stripe Dashboard
                      </li>
                    </ul>

                    <button
                      onClick={handleStripeConnect}
                      disabled={stripeConnecting}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '12px 24px',
                        background: '#635bff',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '500',
                        cursor: stripeConnecting ? 'not-allowed' : 'pointer',
                        opacity: stripeConnecting ? 0.7 : 1,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      }}
                    >
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                      </svg>
                      {stripeConnecting ? 'Connecting...' : 'Connect with Stripe'}
                    </button>
                  </>
                )}
              </>
            )}
          </div>

          {/* Other Settings Link */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f8f8f8',
              borderRadius: '8px',
            }}
          >
            <p style={{ fontSize: '14px', color: '#666', margin: 0 }}>
              Looking for other settings?{' '}
              <Link
                href={`/srv/${expertId}/settings/domain`}
                style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                Domain Settings
              </Link>{' '}
              |{' '}
              <Link
                href={`/srv/${expertId}/settings/email`}
                style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
              >
                Email Settings
              </Link>
            </p>
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

export default function SettingsPage() {
  return (
    <Suspense
      fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading settings...</div>}
    >
      <SettingsContent />
    </Suspense>
  );
}
