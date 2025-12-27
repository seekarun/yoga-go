'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import NotificationOverlay from '@/components/NotificationOverlay';

import type { StripeConnectDetails, RazorpayRouteDetails, CashfreePayoutDetails } from '@/types';

type DisconnectType = 'google' | 'zoom' | 'razorpay' | 'cashfree' | null;

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

  // Razorpay Route state (India payouts)
  const [razorpayLoading, setRazorpayLoading] = useState(true);
  const [razorpaySaving, setRazorpaySaving] = useState(false);
  const [razorpayDisconnecting, setRazorpayDisconnecting] = useState(false);
  const [razorpayConnectionStatus, setRazorpayConnectionStatus] =
    useState<RazorpayRouteDetails | null>(null);
  const [razorpayFormData, setRazorpayFormData] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    beneficiaryName: '',
  });

  // Cashfree Payouts state (India payouts - Alternative)
  const [cashfreeLoading, setCashfreeLoading] = useState(true);
  const [cashfreeSaving, setCashfreeSaving] = useState(false);
  const [cashfreeDisconnecting, setCashfreeDisconnecting] = useState(false);
  const [cashfreeConnectionStatus, setCashfreeConnectionStatus] =
    useState<CashfreePayoutDetails | null>(null);
  const [cashfreeFormData, setCashfreeFormData] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    beneficiaryName: '',
    email: '',
    phone: '',
  });

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

  const fetchRazorpayStatus = useCallback(async () => {
    try {
      setRazorpayLoading(true);
      const response = await fetch('/api/razorpay/route/status');
      const data = await response.json();

      if (data.success && data.data.status !== 'not_connected') {
        setRazorpayConnectionStatus(data.data);
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching Razorpay status:', err);
    } finally {
      setRazorpayLoading(false);
    }
  }, []);

  const fetchCashfreeStatus = useCallback(async () => {
    try {
      setCashfreeLoading(true);
      const response = await fetch('/api/cashfree/payout/status');
      const data = await response.json();

      if (data.success && data.data.status !== 'not_connected') {
        setCashfreeConnectionStatus(data.data);
      }
    } catch (err) {
      console.error('[DBG][settings] Error fetching Cashfree status:', err);
    } finally {
      setCashfreeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGoogleStatus();
    fetchZoomStatus();
    fetchStripeStatus();
    fetchRazorpayStatus();
    fetchCashfreeStatus();
  }, [
    fetchGoogleStatus,
    fetchZoomStatus,
    fetchStripeStatus,
    fetchRazorpayStatus,
    fetchCashfreeStatus,
  ]);

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
    } else if (confirmDisconnect === 'razorpay') {
      handleRazorpayDisconnectConfirm();
    } else if (confirmDisconnect === 'cashfree') {
      handleCashfreeDisconnectConfirm();
    }
  };

  // Razorpay handlers
  const handleRazorpayFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRazorpayFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRazorpaySave = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (
      !razorpayFormData.accountNumber ||
      !razorpayFormData.ifscCode ||
      !razorpayFormData.beneficiaryName
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (razorpayFormData.accountNumber !== razorpayFormData.confirmAccountNumber) {
      setError('Account numbers do not match');
      return;
    }

    // IFSC validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(razorpayFormData.ifscCode.toUpperCase())) {
      setError('Invalid IFSC code format (e.g., SBIN0001234)');
      return;
    }

    setRazorpaySaving(true);

    try {
      const response = await fetch('/api/razorpay/route/save-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: razorpayFormData.accountNumber,
          ifscCode: razorpayFormData.ifscCode.toUpperCase(),
          beneficiaryName: razorpayFormData.beneficiaryName,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(
          'Bank account saved successfully! Payouts will be enabled once Razorpay activates your account.'
        );
        fetchRazorpayStatus();
        setRazorpayFormData({
          accountNumber: '',
          confirmAccountNumber: '',
          ifscCode: '',
          beneficiaryName: '',
        });
      } else {
        setError(data.error || 'Failed to save bank account');
      }
    } catch (err) {
      console.error('[DBG][settings] Error saving Razorpay bank details:', err);
      setError('Failed to save bank account');
    } finally {
      setRazorpaySaving(false);
    }
  };

  const handleRazorpayDisconnectClick = () => {
    setConfirmDisconnect('razorpay');
  };

  const handleRazorpayDisconnectConfirm = async () => {
    setRazorpayDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/razorpay/route/status', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setRazorpayConnectionStatus(null);
        setSuccess('Bank account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect bank account');
      }
    } catch (err) {
      console.error('[DBG][settings] Error disconnecting Razorpay:', err);
      setError('Failed to disconnect bank account');
    } finally {
      setRazorpayDisconnecting(false);
      setConfirmDisconnect(null);
    }
  };

  // Cashfree handlers
  const handleCashfreeFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCashfreeFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCashfreeSave = async () => {
    setError('');
    setSuccess('');

    // Validation
    if (
      !cashfreeFormData.accountNumber ||
      !cashfreeFormData.ifscCode ||
      !cashfreeFormData.beneficiaryName ||
      !cashfreeFormData.email ||
      !cashfreeFormData.phone
    ) {
      setError('Please fill in all required fields');
      return;
    }

    if (cashfreeFormData.accountNumber !== cashfreeFormData.confirmAccountNumber) {
      setError('Account numbers do not match');
      return;
    }

    // IFSC validation
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(cashfreeFormData.ifscCode.toUpperCase())) {
      setError('Invalid IFSC code format (e.g., SBIN0001234)');
      return;
    }

    // Phone validation (10 digits)
    const phoneClean = cashfreeFormData.phone.replace(/[^0-9]/g, '');
    if (phoneClean.length !== 10) {
      setError('Phone number must be 10 digits');
      return;
    }

    setCashfreeSaving(true);

    try {
      const response = await fetch('/api/cashfree/payout/save-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: cashfreeFormData.accountNumber,
          ifscCode: cashfreeFormData.ifscCode.toUpperCase(),
          beneficiaryName: cashfreeFormData.beneficiaryName,
          email: cashfreeFormData.email,
          phone: cashfreeFormData.phone,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Bank account saved successfully! Verification in progress.');
        fetchCashfreeStatus();
        setCashfreeFormData({
          accountNumber: '',
          confirmAccountNumber: '',
          ifscCode: '',
          beneficiaryName: '',
          email: '',
          phone: '',
        });
      } else {
        setError(data.error || 'Failed to save bank account');
      }
    } catch (err) {
      console.error('[DBG][settings] Error saving Cashfree bank details:', err);
      setError('Failed to save bank account');
    } finally {
      setCashfreeSaving(false);
    }
  };

  const handleCashfreeDisconnectClick = () => {
    setConfirmDisconnect('cashfree');
  };

  const handleCashfreeDisconnectConfirm = async () => {
    setCashfreeDisconnecting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/cashfree/payout/status', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        setCashfreeConnectionStatus(null);
        setSuccess('Bank account disconnected successfully');
      } else {
        setError(data.error || 'Failed to disconnect bank account');
      }
    } catch (err) {
      console.error('[DBG][settings] Error disconnecting Cashfree:', err);
      setError('Failed to disconnect bank account');
    } finally {
      setCashfreeDisconnecting(false);
      setConfirmDisconnect(null);
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

          {/* Stripe Connect Section - Payments */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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

          {/* Google Calendar Section */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginTop: '24px',
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

          {/* Razorpay Payouts Section (India) */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginTop: '24px',
              border:
                razorpayConnectionStatus?.status === 'activated'
                  ? '2px solid #528ff0'
                  : razorpayConnectionStatus?.status === 'pending'
                    ? '2px solid #f59e0b'
                    : '1px solid #ddd',
            }}
          >
            {razorpayLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#666' }}>Loading Razorpay settings...</div>
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
                  {/* Razorpay Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background:
                        razorpayConnectionStatus?.status === 'activated'
                          ? '#e8f0fe'
                          : razorpayConnectionStatus?.status === 'pending'
                            ? '#fef3c7'
                            : '#f8f8f8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="#528ff0">
                      <path
                        d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                        stroke="#528ff0"
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>

                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Payouts (India - Razorpay)
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
                            razorpayConnectionStatus?.status === 'activated'
                              ? '#e8f0fe'
                              : razorpayConnectionStatus?.status === 'pending'
                                ? '#fef3c7'
                                : '#f5f5f5',
                          color:
                            razorpayConnectionStatus?.status === 'activated'
                              ? '#1e40af'
                              : razorpayConnectionStatus?.status === 'pending'
                                ? '#d97706'
                                : '#666',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {razorpayConnectionStatus?.status === 'activated'
                          ? 'Connected'
                          : razorpayConnectionStatus?.status === 'pending'
                            ? 'Pending Verification'
                            : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                {razorpayConnectionStatus?.status === 'activated' ||
                razorpayConnectionStatus?.status === 'pending' ? (
                  <>
                    {/* Connected/Pending State */}
                    <div
                      style={{
                        padding: '16px',
                        background:
                          razorpayConnectionStatus.status === 'activated' ? '#e8f0fe' : '#fef3c7',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          color:
                            razorpayConnectionStatus.status === 'activated' ? '#1e40af' : '#d97706',
                          marginBottom: '8px',
                        }}
                      >
                        {razorpayConnectionStatus.status === 'activated'
                          ? 'Bank Account Connected'
                          : 'Verification in Progress'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          color: '#333',
                        }}
                      >
                        <div>
                          <strong>Account:</strong> ****
                          {razorpayConnectionStatus.bankAccount?.accountNumberLast4}
                        </div>
                        <div>
                          <strong>IFSC:</strong> {razorpayConnectionStatus.bankAccount?.ifscCode}
                        </div>
                        <div>
                          <strong>Name:</strong>{' '}
                          {razorpayConnectionStatus.bankAccount?.beneficiaryName}
                        </div>
                      </div>
                    </div>

                    {razorpayConnectionStatus.status === 'activated' && (
                      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                        Your bank account is verified. When learners in India purchase your courses,
                        you will receive 90% of the payment. The platform retains 10% as a service
                        fee.
                      </p>
                    )}

                    {razorpayConnectionStatus.status === 'pending' && (
                      <p style={{ color: '#d97706', fontSize: '14px', marginBottom: '16px' }}>
                        Your bank account is pending verification by Razorpay. This usually takes
                        1-2 business days. You&apos;ll be able to receive payouts once verified.
                      </p>
                    )}

                    <button
                      onClick={handleRazorpayDisconnectClick}
                      disabled={razorpayDisconnecting}
                      style={{
                        padding: '10px 20px',
                        background: '#fee',
                        color: '#c00',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: razorpayDisconnecting ? 'not-allowed' : 'pointer',
                        opacity: razorpayDisconnecting ? 0.7 : 1,
                      }}
                    >
                      {razorpayDisconnecting ? 'Disconnecting...' : 'Disconnect Bank Account'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Not Connected State - Show Form */}
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                      Add your Indian bank account to receive payouts from course sales in India.
                      This is separate from Stripe (which handles international payments).
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
                        Receive 90% of course payments from Indian learners
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        Automatic payouts to your bank account via Razorpay
                      </li>
                      <li style={{ marginBottom: '8px' }}>
                        Bank verification handled securely by Razorpay
                      </li>
                    </ul>

                    {/* Bank Account Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Account Number *
                        </label>
                        <input
                          type="text"
                          name="accountNumber"
                          value={razorpayFormData.accountNumber}
                          onChange={handleRazorpayFormChange}
                          placeholder="Enter your bank account number"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Confirm Account Number *
                        </label>
                        <input
                          type="text"
                          name="confirmAccountNumber"
                          value={razorpayFormData.confirmAccountNumber}
                          onChange={handleRazorpayFormChange}
                          placeholder="Re-enter your bank account number"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          IFSC Code *
                        </label>
                        <input
                          type="text"
                          name="ifscCode"
                          value={razorpayFormData.ifscCode}
                          onChange={handleRazorpayFormChange}
                          placeholder="e.g., SBIN0001234"
                          maxLength={11}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          11-character code (e.g., SBIN0001234)
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Beneficiary Name (as per bank) *
                        </label>
                        <input
                          type="text"
                          name="beneficiaryName"
                          value={razorpayFormData.beneficiaryName}
                          onChange={handleRazorpayFormChange}
                          placeholder="Enter name as shown in your bank account"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <button
                        onClick={handleRazorpaySave}
                        disabled={razorpaySaving}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          padding: '12px 24px',
                          background: '#528ff0',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: '500',
                          cursor: razorpaySaving ? 'not-allowed' : 'pointer',
                          opacity: razorpaySaving ? 0.7 : 1,
                          marginTop: '8px',
                        }}
                      >
                        {razorpaySaving ? 'Saving...' : 'Save Bank Account'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Cashfree Payouts Section (India - Alternative) */}
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginTop: '24px',
              border:
                cashfreeConnectionStatus?.status === 'verified'
                  ? '2px solid #6366f1'
                  : cashfreeConnectionStatus?.status === 'pending'
                    ? '2px solid #f59e0b'
                    : '1px solid #ddd',
            }}
          >
            {cashfreeLoading ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <div style={{ color: '#666' }}>Loading Cashfree settings...</div>
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
                  {/* Cashfree Icon */}
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background:
                        cashfreeConnectionStatus?.status === 'verified'
                          ? '#eef2ff'
                          : cashfreeConnectionStatus?.status === 'pending'
                            ? '#fef3c7'
                            : '#f8f8f8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="#6366f1">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>

                  <div style={{ flex: 1 }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                      Payouts (India - Cashfree)
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
                            cashfreeConnectionStatus?.status === 'verified'
                              ? '#eef2ff'
                              : cashfreeConnectionStatus?.status === 'pending'
                                ? '#fef3c7'
                                : cashfreeConnectionStatus?.status === 'invalid'
                                  ? '#fee'
                                  : '#f5f5f5',
                          color:
                            cashfreeConnectionStatus?.status === 'verified'
                              ? '#4338ca'
                              : cashfreeConnectionStatus?.status === 'pending'
                                ? '#d97706'
                                : cashfreeConnectionStatus?.status === 'invalid'
                                  ? '#c00'
                                  : '#666',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {cashfreeConnectionStatus?.status === 'verified'
                          ? 'Verified'
                          : cashfreeConnectionStatus?.status === 'pending'
                            ? 'Pending Verification'
                            : cashfreeConnectionStatus?.status === 'invalid'
                              ? 'Invalid Details'
                              : 'Not Connected'}
                      </span>
                    </div>
                  </div>
                </div>

                {cashfreeConnectionStatus?.status === 'verified' ||
                cashfreeConnectionStatus?.status === 'pending' ? (
                  <>
                    {/* Connected/Pending State */}
                    <div
                      style={{
                        padding: '16px',
                        background:
                          cashfreeConnectionStatus.status === 'verified' ? '#eef2ff' : '#fef3c7',
                        borderRadius: '8px',
                        marginBottom: '16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          color:
                            cashfreeConnectionStatus.status === 'verified' ? '#4338ca' : '#d97706',
                          marginBottom: '8px',
                        }}
                      >
                        {cashfreeConnectionStatus.status === 'verified'
                          ? 'Bank Account Verified'
                          : 'Verification in Progress'}
                      </div>
                      <div
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '14px',
                          color: '#333',
                        }}
                      >
                        <div>
                          <strong>Account:</strong> ****
                          {cashfreeConnectionStatus.bankAccount?.accountNumberLast4}
                        </div>
                        <div>
                          <strong>IFSC:</strong> {cashfreeConnectionStatus.bankAccount?.ifscCode}
                        </div>
                        <div>
                          <strong>Name:</strong>{' '}
                          {cashfreeConnectionStatus.bankAccount?.beneficiaryName}
                        </div>
                      </div>
                    </div>

                    {cashfreeConnectionStatus.status === 'verified' && (
                      <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px' }}>
                        Your bank account is verified via Cashfree. When learners in India purchase
                        your courses, you will receive 90% of the payment. The platform retains 10%
                        as a service fee.
                      </p>
                    )}

                    {cashfreeConnectionStatus.status === 'pending' && (
                      <p style={{ color: '#d97706', fontSize: '14px', marginBottom: '16px' }}>
                        Your bank account is pending verification. This usually takes a few minutes.
                        You&apos;ll be able to receive payouts once verified.
                      </p>
                    )}

                    <button
                      onClick={handleCashfreeDisconnectClick}
                      disabled={cashfreeDisconnecting}
                      style={{
                        padding: '10px 20px',
                        background: '#fee',
                        color: '#c00',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: cashfreeDisconnecting ? 'not-allowed' : 'pointer',
                        opacity: cashfreeDisconnecting ? 0.7 : 1,
                      }}
                    >
                      {cashfreeDisconnecting ? 'Disconnecting...' : 'Disconnect Bank Account'}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Not Connected State - Show Form */}
                    <p style={{ color: '#666', fontSize: '14px', marginBottom: '20px' }}>
                      Add your Indian bank account via Cashfree to receive payouts. This is an
                      alternative to Razorpay for Indian payouts.
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
                        Receive 90% of course payments from Indian learners
                      </li>
                      <li style={{ marginBottom: '8px' }}>Fast bank verification via Cashfree</li>
                      <li style={{ marginBottom: '8px' }}>
                        Automatic payouts to your bank account
                      </li>
                    </ul>

                    {/* Bank Account Form */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Account Number *
                        </label>
                        <input
                          type="text"
                          name="accountNumber"
                          value={cashfreeFormData.accountNumber}
                          onChange={handleCashfreeFormChange}
                          placeholder="Enter your bank account number"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Confirm Account Number *
                        </label>
                        <input
                          type="text"
                          name="confirmAccountNumber"
                          value={cashfreeFormData.confirmAccountNumber}
                          onChange={handleCashfreeFormChange}
                          placeholder="Re-enter your bank account number"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          IFSC Code *
                        </label>
                        <input
                          type="text"
                          name="ifscCode"
                          value={cashfreeFormData.ifscCode}
                          onChange={handleCashfreeFormChange}
                          placeholder="e.g., SBIN0001234"
                          maxLength={11}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
                          11-character code (e.g., SBIN0001234)
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Beneficiary Name (as per bank) *
                        </label>
                        <input
                          type="text"
                          name="beneficiaryName"
                          value={cashfreeFormData.beneficiaryName}
                          onChange={handleCashfreeFormChange}
                          placeholder="Enter name as shown in your bank account"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Email *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={cashfreeFormData.email}
                          onChange={handleCashfreeFormChange}
                          placeholder="Enter your email address"
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: '500',
                            marginBottom: '6px',
                            color: '#333',
                          }}
                        >
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={cashfreeFormData.phone}
                          onChange={handleCashfreeFormChange}
                          placeholder="10-digit mobile number"
                          maxLength={10}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            fontSize: '14px',
                            boxSizing: 'border-box',
                          }}
                        />
                      </div>

                      <button
                        onClick={handleCashfreeSave}
                        disabled={cashfreeSaving}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '10px',
                          padding: '12px 24px',
                          background: '#6366f1',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '15px',
                          fontWeight: '500',
                          cursor: cashfreeSaving ? 'not-allowed' : 'pointer',
                          opacity: cashfreeSaving ? 0.7 : 1,
                          marginTop: '8px',
                        }}
                      >
                        {cashfreeSaving ? 'Saving...' : 'Save Bank Account'}
                      </button>
                    </div>
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
        message={`Are you sure you want to disconnect your ${confirmDisconnect === 'google' ? 'Google' : confirmDisconnect === 'zoom' ? 'Zoom' : confirmDisconnect === 'razorpay' ? 'Razorpay bank' : confirmDisconnect === 'cashfree' ? 'Cashfree bank' : 'bank'} account?`}
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
