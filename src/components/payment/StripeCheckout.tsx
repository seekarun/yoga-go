'use client';

import { useEffect, useState } from 'react';
import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useAuth } from '@/contexts/AuthContext';
import { PAYMENT_CONFIG } from '@/config/payment';

interface StripeCheckoutProps {
  amount: number; // in cents
  currency: string;
  type: 'course' | 'subscription';
  itemId: string;
  itemName: string;
  planType?: 'curious' | 'committed'; // For subscriptions
  billingInterval?: 'monthly' | 'yearly'; // For subscriptions
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

// Load Stripe instance (singleton)
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = PAYMENT_CONFIG.stripe.publishableKey;
    if (!publishableKey) {
      console.error('[DBG][stripe] Publishable key not configured');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

// Card styling
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#32325d',
      fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#fa755a',
      iconColor: '#fa755a',
    },
  },
};

// Payment form component (must be inside Elements provider)
function CheckoutForm({
  amount,
  currency,
  type,
  itemId,
  itemName,
  planType,
  billingInterval,
  onSuccess,
  onFailure,
}: StripeCheckoutProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !user) {
      setError('Payment system not ready. Please try again.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      let clientSecret: string;
      let paymentId: string;

      if (type === 'subscription') {
        // Subscription Flow
        console.log('[DBG][stripe] Creating subscription...');

        if (!planType || !billingInterval) {
          throw new Error('Plan type and billing interval are required for subscriptions');
        }

        // Step 1: Create subscription on backend
        const subscriptionResponse = await fetch('/api/payment/stripe/create-subscription', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planType,
            billingInterval,
            userId: user.id,
            userEmail: user.profile.email,
            userName: user.profile.name,
            currency: currency.toUpperCase(),
          }),
        });

        const subscriptionData = await subscriptionResponse.json();

        if (!subscriptionData.success) {
          throw new Error(subscriptionData.error || 'Failed to create subscription');
        }

        clientSecret = subscriptionData.data.clientSecret;
        paymentId = subscriptionData.data.subscriptionId;

        if (!clientSecret) {
          throw new Error('No client secret returned from subscription creation');
        }

        console.log('[DBG][stripe] Subscription created, confirming payment...');

        // Step 2: Confirm subscription payment with card
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: user.profile.name,
                email: user.profile.email,
              },
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status !== 'succeeded') {
          throw new Error('Subscription payment not completed');
        }

        console.log('[DBG][stripe] Subscription payment succeeded:', paymentIntent.id);
        onSuccess(paymentId);
      } else {
        // One-time Payment Flow (existing code for course purchases)
        console.log('[DBG][stripe] Creating one-time payment...');

        // Step 1: Create PaymentIntent on backend
        const intentResponse = await fetch('/api/payment/stripe/create-payment-intent', {
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

        const intentData = await intentResponse.json();

        if (!intentData.success) {
          throw new Error(intentData.error || 'Failed to create payment intent');
        }

        clientSecret = intentData.data.clientSecret;
        const paymentIntentId = intentData.data.paymentIntentId;

        // Step 2: Confirm payment with card element
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: user.profile.name,
                email: user.profile.email,
              },
            },
          }
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }

        if (paymentIntent?.status !== 'succeeded') {
          throw new Error('Payment not completed');
        }

        console.log('[DBG][stripe] Payment succeeded:', paymentIntent.id);

        // Step 3: Verify payment on backend and enroll user
        const confirmResponse = await fetch('/api/payment/stripe/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentIntentId,
            type,
            itemId,
            userId: user.id,
          }),
        });

        const confirmData = await confirmResponse.json();

        if (confirmData.success) {
          onSuccess(paymentIntent.id);
        } else {
          onFailure(confirmData.error || 'Payment verification failed');
        }
      }
    } catch (err) {
      console.error('[DBG][stripe] Payment error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Payment failed';
      setError(errorMessage);
      onFailure(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        style={{
          marginBottom: '20px',
          padding: '12px',
          border: '1px solid #e0e0e0',
          borderRadius: '4px',
          backgroundColor: '#fff',
        }}
      >
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>

      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || loading}
        style={{
          width: '100%',
          padding: '16px',
          background: loading || !stripe ? '#ccc' : '#635bff',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: loading || !stripe ? 'not-allowed' : 'pointer',
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
            Pay {currency === 'USD' ? '$' : '€'}
            {(amount / 100).toFixed(2)}
          </>
        )}
      </button>

      <div
        style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#8898aa',
          textAlign: 'center',
        }}
      >
        Powered by Stripe • Secure payment processing
      </div>

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
    </form>
  );
}

// Main component with Elements provider
export default function StripeCheckout(props: StripeCheckoutProps) {
  const [stripeLoaded, setStripeLoaded] = useState(false);
  const stripePromise = getStripe();

  useEffect(() => {
    if (stripePromise) {
      stripePromise
        .then(stripe => {
          if (stripe) {
            setStripeLoaded(true);
          } else {
            console.error('[DBG][stripe] Failed to load Stripe');
            props.onFailure('Failed to load payment system');
          }
        })
        .catch(error => {
          console.error('[DBG][stripe] Error loading Stripe:', error);
          props.onFailure('Failed to load payment system');
        });
    } else {
      props.onFailure('Stripe not configured');
    }
  }, [props]);

  if (!stripeLoaded || !stripePromise) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#666',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e0e0e0',
            borderTop: '3px solid #635bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }}
        />
        Loading payment system...
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

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm {...props} />
    </Elements>
  );
}
