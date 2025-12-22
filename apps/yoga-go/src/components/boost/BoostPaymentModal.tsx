'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { usePayment } from '@/contexts/PaymentContext';
import { formatPrice } from '@/lib/geolocation';
import RazorpayCheckout from '@/components/payment/RazorpayCheckout';
import StripeCheckout from '@/components/payment/StripeCheckout';
import type { Boost } from '@/types';

interface BoostPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  boost: Boost;
  expertId: string;
}

export default function BoostPaymentModal({
  isOpen,
  onClose,
  boost,
  expertId,
}: BoostPaymentModalProps) {
  const router = useRouter();
  const { refreshUser } = useAuth();
  const { gateway, currency: detectedCurrency, loading: locationLoading } = usePayment();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Use boost currency if set, otherwise use detected currency
  const currency = boost.currency || detectedCurrency;
  const useRazorpay = currency === 'INR' || gateway === 'razorpay';

  useEffect(() => {
    if (isOpen) {
      console.log('[DBG][BoostPaymentModal] Opened for boost:', boost.id);
    }
  }, [isOpen, boost.id]);

  if (!isOpen) return null;

  const handleSuccess = async (paymentId: string) => {
    console.log('[DBG][BoostPaymentModal] Payment successful:', paymentId);

    try {
      // Confirm payment on backend - update boost status
      const response = await fetch(`/data/app/expert/me/boosts/${boost.id}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          gateway: useRazorpay ? 'razorpay' : 'stripe',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaymentStatus('success');
        await refreshUser();

        // Redirect after success
        setTimeout(() => {
          router.push(`/srv/${expertId}/boost`);
          router.refresh();
          onClose();
        }, 2000);
      } else {
        setPaymentStatus('error');
        setErrorMessage(data.error || 'Failed to confirm payment');
      }
    } catch (error) {
      console.error('[DBG][BoostPaymentModal] Confirmation error:', error);
      setPaymentStatus('error');
      setErrorMessage('Failed to confirm payment');
    }
  };

  const handleFailure = (error: string) => {
    setPaymentStatus('error');
    setErrorMessage(error);
    console.error('[DBG][BoostPaymentModal] Payment failed:', error);
  };

  const handleClose = () => {
    if (paymentStatus !== 'success') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-md w-full p-8 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        {paymentStatus !== 'success' && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
          >
            &times;
          </button>
        )}

        {/* Success State */}
        {paymentStatus === 'success' && (
          <div className="text-center">
            <div className="text-6xl mb-4">&#10003;</div>
            <h2 className="text-2xl font-semibold mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-4">Your boost campaign is being submitted for review.</p>
            <p className="text-sm text-gray-400">Redirecting...</p>
          </div>
        )}

        {/* Error State */}
        {paymentStatus === 'error' && (
          <div className="text-center">
            <div className="text-6xl mb-4 text-red-500">&#10007;</div>
            <h2 className="text-2xl font-semibold mb-2">Payment Failed</h2>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => {
                setPaymentStatus('idle');
                setErrorMessage('');
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Payment Form */}
        {paymentStatus === 'idle' && (
          <>
            <h2 className="text-2xl font-semibold mb-2">Complete Payment</h2>
            <p className="text-gray-600 mb-6">Boost Campaign - {boost.goal.replace('_', ' ')}</p>

            {/* Amount Display */}
            <div className="bg-gray-50 rounded-xl p-5 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Amount:</span>
                <span className="text-2xl font-bold text-indigo-600">
                  {formatPrice(boost.budget, currency as 'INR' | 'USD')}
                </span>
              </div>
            </div>

            {/* Gateway Info */}
            <div className="flex items-center gap-2 mb-4 p-3 bg-indigo-50 rounded-lg">
              <span className="text-sm text-gray-600">
                Payment via: <strong>{useRazorpay ? 'Razorpay' : 'Stripe'}</strong>
              </span>
              {locationLoading && (
                <span className="text-xs text-gray-400">(Detecting location...)</span>
              )}
            </div>

            {/* Payment Component */}
            {!locationLoading && (
              <>
                {useRazorpay ? (
                  <RazorpayCheckout
                    amount={boost.budget}
                    currency={currency}
                    type="boost"
                    itemId={boost.id}
                    itemName={`Boost Campaign: ${boost.goal.replace('_', ' ')}`}
                    onSuccess={handleSuccess}
                    onFailure={handleFailure}
                  />
                ) : (
                  <StripeCheckout
                    amount={boost.budget}
                    currency={currency}
                    type="boost"
                    itemId={boost.id}
                    itemName={`Boost Campaign: ${boost.goal.replace('_', ' ')}`}
                    onSuccess={handleSuccess}
                    onFailure={handleFailure}
                  />
                )}
              </>
            )}

            {/* Security Note */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-center">
              Secure payment powered by {useRazorpay ? 'Razorpay' : 'Stripe'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
