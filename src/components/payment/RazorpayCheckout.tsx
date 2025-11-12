'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface RazorpayCheckoutProps {
  amount: number; // in paise
  currency: string;
  type: 'course' | 'subscription';
  itemId: string; // courseId or planType
  itemName: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

// Extend Window interface for Razorpay
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: any;
  }
}

export default function RazorpayCheckout({
  amount,
  currency,
  type,
  itemId,
  itemName,
  onSuccess,
  onFailure,
}: RazorpayCheckoutProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      console.error('[Razorpay] Failed to load Razorpay script');
      onFailure('Failed to load payment gateway');
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [onFailure]);

  const handlePayment = async () => {
    if (!scriptLoaded) {
      onFailure('Payment gateway not loaded');
      return;
    }

    if (!user) {
      onFailure('Please login to continue');
      return;
    }

    try {
      setLoading(true);

      // Step 1: Create order on backend
      const orderResponse = await fetch('/api/payment/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          currency,
          type,
          itemId,
          userId: user.id,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create order');
      }

      const orderData = await orderResponse.json();

      if (!orderData.success) {
        throw new Error(orderData.error || 'Failed to create order');
      }

      // Step 2: Open Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'Yoga-GO',
        description: itemName,
        order_id: orderData.data.orderId,
        prefill: {
          name: user.profile.name,
          email: user.profile.email,
        },
        theme: {
          color: 'var(--color-primary)',
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          // Step 3: Verify payment on backend
          try {
            const verifyResponse = await fetch('/api/payment/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                type,
                itemId,
                userId: user.id,
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyData.success) {
              onSuccess(response.razorpay_payment_id);
            } else {
              onFailure(verifyData.error || 'Payment verification failed');
            }
          } catch (error) {
            console.error('[Razorpay] Verification error:', error);
            onFailure('Payment verification failed');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            onFailure('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('[Razorpay] Payment error:', error);
      onFailure(error instanceof Error ? error.message : 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading || !scriptLoaded}
        style={{
          width: '100%',
          padding: '16px',
          background: loading ? '#ccc' : 'var(--color-primary)',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {loading ? (
          <>
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid #fff',
                borderTop: '2px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            Processing...
          </>
        ) : (
          <>
            <span>
              Pay {currency === 'INR' ? '₹' : '$'}
              {(amount / 100).toFixed(2)}
            </span>
          </>
        )}
      </button>
      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
