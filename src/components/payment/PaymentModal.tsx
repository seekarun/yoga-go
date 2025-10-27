'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePayment } from '@/contexts/PaymentContext';
import { PAYMENT_CONFIG } from '@/config/payment';
import { formatPrice } from '@/lib/geolocation';
import { trackPaymentModalOpen, trackEnrollmentComplete } from '@/lib/analytics';
import RazorpayCheckout from './RazorpayCheckout';
import StripeCheckout from './StripeCheckout';
import { posthog } from '@/providers/PostHogProvider';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'course' | 'subscription';
  item: {
    id: string;
    title: string;
    price?: number; // For courses
    planType?: 'curious' | 'committed'; // For subscriptions
    billingInterval?: 'monthly' | 'yearly'; // For subscriptions
  };
}

export default function PaymentModal({ isOpen, onClose, type, item }: PaymentModalProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { gateway, currency, loading: locationLoading } = usePayment();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Track payment modal open
  useEffect(() => {
    if (isOpen) {
      // Custom analytics (existing)
      if (type === 'course') {
        trackPaymentModalOpen(item.id).catch(err => {
          console.error('[DBG][PaymentModal] Failed to track payment modal open:', err);
        });
      }

      // PostHog analytics
      const amount = getAmount();
      posthog.capture('payment_modal_opened', {
        type,
        itemId: item.id,
        itemTitle: item.title,
        planType: item.planType,
        billingInterval: item.billingInterval,
        amount,
        currency,
        gateway,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, type, item.id, item.title, item.planType, item.billingInterval, currency, gateway]);

  if (!isOpen) return null;

  // Calculate amount based on type
  const getAmount = () => {
    if (type === 'course') {
      // Course price in smallest unit (paise/cents)
      return (item.price || 0) * 100;
    } else if (type === 'subscription' && item.planType) {
      // Subscription price from config
      const plan = PAYMENT_CONFIG.plans[item.planType];
      const interval = item.billingInterval || 'yearly';
      return currency === 'INR' ? plan[interval].inr : plan[interval].usd;
    }
    return 0;
  };

  const amount = getAmount();

  const handleSuccess = async (paymentId: string) => {
    setPaymentStatus('success');
    console.log('[DBG][PaymentModal] Payment successful:', paymentId);

    // Track enrollment completion (custom analytics)
    if (type === 'course') {
      trackEnrollmentComplete(item.id, paymentId).catch(err => {
        console.error('[DBG][PaymentModal] Failed to track enrollment complete:', err);
      });
    }

    // PostHog analytics
    posthog.capture('payment_success', {
      type,
      itemId: item.id,
      itemTitle: item.title,
      planType: item.planType,
      billingInterval: item.billingInterval,
      paymentId,
      amount,
      currency,
      gateway,
    });

    // Refresh user data to get updated enrollments
    console.log('[DBG][PaymentModal] Refreshing user data...');
    await refreshUser();
    console.log('[DBG][PaymentModal] User data refreshed');

    // Redirect after success
    setTimeout(() => {
      if (type === 'course') {
        router.push(`/app/courses/${item.id}`);
      } else {
        router.push('/app/profile');
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
      planType: item.planType,
      billingInterval: item.billingInterval,
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
              {type === 'course'
                ? 'You now have access to the course.'
                : 'Your subscription has been activated.'}
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
            <button
              onClick={() => {
                setPaymentStatus('idle');
                setErrorMessage('');
              }}
              style={{
                padding: '12px 24px',
                background: '#764ba2',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
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
                <span style={{ fontSize: '24px', fontWeight: '700', color: '#764ba2' }}>
                  {formatPrice(amount, currency)}
                </span>
              </div>
              {type === 'subscription' && (
                <div style={{ fontSize: '12px', color: '#999', marginTop: '8px' }}>
                  Billed annually
                </div>
              )}
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
              {locationLoading && (
                <span style={{ fontSize: '12px', color: '#999' }}>(Detecting location...)</span>
              )}
            </div>

            {/* Payment Component */}
            {!locationLoading && (
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
                    planType={item.planType}
                    billingInterval={item.billingInterval}
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
