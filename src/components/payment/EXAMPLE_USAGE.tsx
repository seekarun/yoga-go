/**
 * EXAMPLE: How to use PaymentModal in your components
 *
 * This file shows examples of integrating payments into:
 * 1. Course cards (one-time purchase)
 * 2. Pricing page (subscriptions)
 * 3. Profile page (upgrade membership)
 */

'use client';

import { useState } from 'react';
import PaymentModal from './PaymentModal';

// ============================================
// EXAMPLE 1: Course Card with Payment
// ============================================
export function CourseCardWithPayment({ course }: { course: any }) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <div>
      <h3>{course.title}</h3>
      <p>${course.price}</p>

      <button onClick={() => setShowPayment(true)}>Enroll Now</button>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        type="course"
        item={{
          id: course.id,
          title: course.title,
          price: course.price,
        }}
      />
    </div>
  );
}

// ============================================
// EXAMPLE 2: Subscription Plan with Payment
// ============================================
export function PricingPlanWithPayment() {
  const [showPayment, setShowPayment] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'curious' | 'committed' | null>(null);

  const handleSelectPlan = (plan: 'curious' | 'committed') => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  return (
    <div>
      <div>
        <h3>Curious Plan</h3>
        <p>$299/year</p>
        <button onClick={() => handleSelectPlan('curious')}>Get Started</button>
      </div>

      <div>
        <h3>Committed Plan</h3>
        <p>$599/year</p>
        <button onClick={() => handleSelectPlan('committed')}>Go Premium</button>
      </div>

      {selectedPlan && (
        <PaymentModal
          isOpen={showPayment}
          onClose={() => {
            setShowPayment(false);
            setSelectedPlan(null);
          }}
          type="subscription"
          item={{
            id: selectedPlan,
            title: `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} Plan`,
            planType: selectedPlan,
          }}
        />
      )}
    </div>
  );
}

// ============================================
// EXAMPLE 3: Upgrade Membership from Profile
// ============================================
export function UpgradeMembershipButton({ currentPlan }: { currentPlan: string }) {
  const [showPayment, setShowPayment] = useState(false);

  // Don't show upgrade if already on highest plan
  if (currentPlan === 'committed') {
    return null;
  }

  return (
    <>
      <button onClick={() => setShowPayment(true)}>Upgrade to Committed Plan</button>

      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        type="subscription"
        item={{
          id: 'committed',
          title: 'Committed Plan',
          planType: 'committed',
        }}
      />
    </>
  );
}

// ============================================
// EXAMPLE 4: Using Payment Context
// ============================================
import { usePayment } from '@/contexts/PaymentContext';
import { formatPrice } from '@/lib/geolocation';

export function PriceDisplay({ amount }: { amount: number }) {
  const { currency, gateway, loading } = usePayment();

  if (loading) {
    return <span>Loading price...</span>;
  }

  return (
    <div>
      <span>{formatPrice(amount, currency)}</span>
      <small>via {gateway === 'razorpay' ? 'Razorpay' : 'Stripe'}</small>
    </div>
  );
}

// ============================================
// EXAMPLE 5: Conditional Rendering Based on Gateway
// ============================================
export function PaymentMethodInfo() {
  const { gateway, country } = usePayment();

  return (
    <div>
      {gateway === 'razorpay' ? (
        <div>
          <p>Payment methods available in India:</p>
          <ul>
            <li>💳 Credit/Debit Cards</li>
            <li>🏦 Net Banking</li>
            <li>📱 UPI</li>
            <li>💰 Wallets (Paytm, PhonePe, etc.)</li>
          </ul>
        </div>
      ) : (
        <div>
          <p>International payment methods:</p>
          <ul>
            <li>💳 Credit/Debit Cards</li>
            <li>🌐 Apple Pay / Google Pay</li>
            <li>🏦 Bank Transfers</li>
          </ul>
        </div>
      )}
      <small>Detected location: {country}</small>
    </div>
  );
}
