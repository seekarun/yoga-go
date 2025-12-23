'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton } from '@/components/Button';
import { formatPriceWithCurrency } from '@/lib/geolocation';
import { trackPaymentModalOpen, trackEnrollmentComplete } from '@/lib/analytics';
import RazorpayCheckout from './RazorpayCheckout';
import StripeCheckout from './StripeCheckout';
import { posthog } from '@/providers/PostHogProvider';
import type { PaymentGateway } from '@/config/payment';
import type { SupportedCurrency } from '@/types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'course' | 'webinar';
  item: {
    id: string;
    title: string;
    price: number;
    currency?: SupportedCurrency;
  };
  /** Expert ID - used to determine payment gateway based on expert's connected accounts */
  expertId: string;
}

export default function PaymentModal({ isOpen, onClose, type, item, expertId }: PaymentModalProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const [gateway, setGateway] = useState<PaymentGateway>('razorpay');
  const [currency, setCurrency] = useState<SupportedCurrency>(item.currency || 'INR');
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch expert's payment provider status when modal opens
  useEffect(() => {
    const fetchExpertPaymentProvider = async () => {
      if (!isOpen || !expertId) return;

      try {
        setLoading(true);
        console.log('[DBG][PaymentModal] Fetching expert payment provider:', expertId);

        const response = await fetch(`/api/stripe/connect/status?expertId=${expertId}`);
        const data = await response.json();

        if (data.success && data.data?.status === 'active' && data.data?.chargesEnabled) {
          // Expert has active Stripe connected account - use Stripe
          console.log('[DBG][PaymentModal] Expert has Stripe connected, using Stripe');
          setGateway('stripe');
          // Use the item's currency (expert's preferred currency) or default to USD for Stripe
          setCurrency(item.currency || 'USD');
        } else {
          // No Stripe connected - use Razorpay (default for platform)
          console.log('[DBG][PaymentModal] No Stripe connected, using Razorpay');
          setGateway('razorpay');
          setCurrency('INR');
        }
      } catch (error) {
        console.error('[DBG][PaymentModal] Error fetching expert payment provider:', error);
        // Default to Razorpay on error
        setGateway('razorpay');
        setCurrency('INR');
      } finally {
        setLoading(false);
      }
    };

    fetchExpertPaymentProvider();
  }, [isOpen, expertId, item.currency]);

  // Track payment modal open
  useEffect(() => {
    if (isOpen) {
      // Custom analytics (existing)
      trackPaymentModalOpen(item.id).catch(err => {
        console.error('[DBG][PaymentModal] Failed to track payment modal open:', err);
      });

      // PostHog analytics
      const amount = getAmount();
      posthog.capture('payment_modal_opened', {
        type,
        itemId: item.id,
        itemTitle: item.title,
        amount,
        currency,
        gateway,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, item.id, item.title, currency, gateway]);

  if (!isOpen) return null;

  // Calculate amount - course price in smallest unit (paise/cents)
  const getAmount = () => {
    return item.price * 100;
  };

  const amount = getAmount();

  const handleSuccess = async (paymentId: string) => {
    setPaymentStatus('success');
    console.log('[DBG][PaymentModal] Payment successful:', paymentId);

    // Track enrollment completion (custom analytics)
    trackEnrollmentComplete(item.id, paymentId).catch(err => {
      console.error('[DBG][PaymentModal] Failed to track enrollment complete:', err);
    });

    // PostHog analytics
    posthog.capture('payment_success', {
      type,
      itemId: item.id,
      itemTitle: item.title,
      paymentId,
      amount,
      currency,
      gateway,
    });

    // Refresh user data to get updated enrollments
    console.log('[DBG][PaymentModal] Refreshing user data...');
    await refreshUser();
    console.log('[DBG][PaymentModal] User data refreshed');

    // Redirect after success based on type
    setTimeout(() => {
      if (type === 'webinar') {
        router.push(`/app/webinars/${item.id}`);
      } else {
        router.push(`/app/courses/${item.id}`);
      }
      router.refresh(); // Force refresh the page data
      onClose();
    }, 2000);
  };

  const handleFailure = (error: string) => {
    setPaymentStatus('error');
    setErrorMessage(error);
    console.error('[PaymentModal] Payment failed:', error);

    // PostHog analytics
    posthog.capture('payment_failed', {
      type,
      itemId: item.id,
      itemTitle: item.title,
      error,
      amount,
      currency,
      gateway,
    });
  };

  const handleClose = () => {
    if (paymentStatus !== 'success') {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          padding: '32px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        {paymentStatus !== 'success' && (
          <button
            onClick={handleClose}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666',
            }}
          >
            ×
          </button>
        )}

        {/* Success State */}
        {paymentStatus === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              Payment Successful!
            </h2>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              {type === 'webinar'
                ? "You're registered for the webinar!"
                : 'You now have access to the course.'}
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>Redirecting...</p>
          </div>
        )}

        {/* Error State */}
        {paymentStatus === 'error' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              Payment Failed
            </h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>{errorMessage}</p>
            <PrimaryButton
              onClick={() => {
                setPaymentStatus('idle');
                setErrorMessage('');
              }}
            >
              Try Again
            </PrimaryButton>
          </div>
        )}

        {/* Payment Form */}
        {paymentStatus === 'idle' && (
          <>
            <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
              Complete Payment
            </h2>
            <p style={{ color: '#666', marginBottom: '24px' }}>{item.title}</p>

            {/* Amount Display */}
            <div
              style={{
                background: '#f8f8f8',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '16px', color: '#666' }}>Total Amount:</span>
                <span
                  style={{ fontSize: '24px', fontWeight: '700', color: 'var(--color-primary)' }}
                >
                  {formatPriceWithCurrency(amount, currency)}
                </span>
              </div>
            </div>

            {/* Gateway Info */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
                padding: '12px',
                background: '#f0f4ff',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '14px', color: '#666' }}>
                Payment via: <strong>{gateway === 'razorpay' ? 'Razorpay' : 'Stripe'}</strong>
              </span>
              {loading && <span style={{ fontSize: '12px', color: '#999' }}>(Loading...)</span>}
            </div>

            {/* Payment Component */}
            {!loading && (
              <>
                {gateway === 'razorpay' ? (
                  <RazorpayCheckout
                    amount={amount}
                    currency={currency}
                    type={type}
                    itemId={item.id}
                    itemName={item.title}
                    onSuccess={handleSuccess}
                    onFailure={handleFailure}
                  />
                ) : (
                  <StripeCheckout
                    amount={amount}
                    currency={currency}
                    type={type}
                    itemId={item.id}
                    itemName={item.title}
                    onSuccess={handleSuccess}
                    onFailure={handleFailure}
                  />
                )}
              </>
            )}

            {/* Security Note */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#f8f8f8',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#666',
                textAlign: 'center',
              }}
            >
              🔒 Secure payment powered by {gateway === 'razorpay' ? 'Razorpay' : 'Stripe'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
