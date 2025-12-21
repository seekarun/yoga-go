'use client';

import { useEffect, useState } from 'react';
import type { Stripe } from '@stripe/stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { PAYMENT_CONFIG } from '@/config/payment';

interface AddFundsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currency?: string;
}

// Preset amounts in cents
const PRESET_AMOUNTS = {
  USD: [1000, 2500, 5000, 10000], // $10, $25, $50, $100
  INR: [50000, 100000, 250000, 500000], // Rs.500, Rs.1000, Rs.2500, Rs.5000
};

// Load Stripe instance (singleton)
let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = PAYMENT_CONFIG.stripe.publishableKey;
    if (!publishableKey) {
      console.error('[DBG][AddFundsModal] Stripe publishable key not configured');
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

function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return formatter.format(amount / 100);
}

// Checkout form (must be inside Elements provider)
function CheckoutForm({
  amount,
  currency,
  onSuccess,
  onFailure,
  onCancel,
}: {
  amount: number;
  currency: string;
  onSuccess: () => void;
  onFailure: (error: string) => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
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

      // Step 1: Create PaymentIntent for wallet deposit
      console.log('[DBG][AddFundsModal] Creating payment intent...');
      const intentResponse = await fetch('/data/app/expert/me/wallet/add-funds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, currency }),
      });

      const intentData = await intentResponse.json();
      if (!intentData.success) {
        throw new Error(intentData.error || 'Failed to create payment intent');
      }

      const { clientSecret, paymentIntentId } = intentData.data;
      console.log('[DBG][AddFundsModal] Payment intent created:', paymentIntentId);

      // Step 2: Confirm payment with card
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      if (paymentIntent?.status !== 'succeeded') {
        throw new Error(`Payment not completed. Status: ${paymentIntent?.status}`);
      }

      console.log('[DBG][AddFundsModal] Payment succeeded, confirming with backend...');

      // Step 3: Confirm with backend to add funds
      const confirmResponse = await fetch('/data/app/expert/me/wallet/add-funds', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });

      const confirmData = await confirmResponse.json();
      if (!confirmData.success) {
        throw new Error(confirmData.error || 'Failed to add funds');
      }

      console.log('[DBG][AddFundsModal] Funds added successfully');
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Payment failed';
      setError(message);
      onFailure(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Card Details</label>
        <div className="p-3 border border-gray-300 rounded-lg">
          <CardElement options={CARD_ELEMENT_OPTIONS} />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary, #6366f1)' }}
        >
          {loading ? 'Processing...' : `Add ${formatAmount(amount, currency)}`}
        </button>
      </div>
    </form>
  );
}

export default function AddFundsModal({
  isOpen,
  onClose,
  onSuccess,
  currency = 'USD',
}: AddFundsModalProps) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [step, setStep] = useState<'amount' | 'payment' | 'success'>('amount');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAmount(null);
      setCustomAmount('');
      setStep('amount');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presetAmounts =
    PRESET_AMOUNTS[currency as keyof typeof PRESET_AMOUNTS] || PRESET_AMOUNTS.USD;
  const amount = selectedAmount || (customAmount ? Math.round(parseFloat(customAmount) * 100) : 0);

  const handleAmountSelect = (amt: number) => {
    setSelectedAmount(amt);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setSelectedAmount(null);
    setCustomAmount(value);
  };

  const handleProceed = () => {
    if (amount >= 100) {
      setStep('payment');
    }
  };

  const handlePaymentSuccess = () => {
    setStep('success');
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  const handlePaymentFailure = (error: string) => {
    console.error('[DBG][AddFundsModal] Payment failed:', error);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={step !== 'success' ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {step === 'success' ? 'Success!' : 'Add Funds to Wallet'}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'amount' && (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Select an amount to add to your boost wallet.
              </p>

              {/* Preset amounts */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {presetAmounts.map(amt => (
                  <button
                    key={amt}
                    onClick={() => handleAmountSelect(amt)}
                    className={`py-3 px-4 rounded-lg border-2 font-medium transition-colors ${
                      selectedAmount === amt
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {formatAmount(amt, currency)}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Or enter custom amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {currency === 'INR' ? 'Rs.' : '$'}
                  </span>
                  <input
                    type="number"
                    value={customAmount}
                    onChange={e => handleCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    min="1"
                    step="0.01"
                    className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                      customAmount ? 'border-indigo-500' : 'border-gray-300'
                    }`}
                  />
                </div>
              </div>

              {/* Proceed button */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleProceed}
                  disabled={amount < 100}
                  className="flex-1 px-4 py-2.5 rounded-lg text-white font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary, #6366f1)' }}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 'payment' && (
            <>
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Amount to add</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(amount, currency)}</p>
              </div>

              <Elements stripe={getStripe()}>
                <CheckoutForm
                  amount={amount}
                  currency={currency}
                  onSuccess={handlePaymentSuccess}
                  onFailure={handlePaymentFailure}
                  onCancel={() => setStep('amount')}
                />
              </Elements>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900 mb-2">
                {formatAmount(amount, currency)} added!
              </p>
              <p className="text-sm text-gray-600">Your wallet has been topped up successfully.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
