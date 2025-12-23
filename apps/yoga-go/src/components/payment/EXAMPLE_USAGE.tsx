/**
 * EXAMPLE: How to use PaymentModal in your components
 *
 * This file shows examples of integrating payments into course cards
 */

'use client';

import { useState } from 'react';
import PaymentModal from './PaymentModal';

// ============================================
// EXAMPLE 1: Course Card with Payment
// ============================================
export function CourseCardWithPayment({
  course,
}: {
  course: { id: string; title: string; price: number };
}) {
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
// EXAMPLE 2: Using Payment Context
// ============================================
import { usePayment } from '@/contexts/PaymentContext';
import { formatPriceWithCurrency } from '@/lib/geolocation';

export function PaymentPriceDisplay({ amount }: { amount: number }) {
  const { currency, gateway, loading } = usePayment();

  if (loading) {
    return <span>Loading price...</span>;
  }

  return (
    <div>
      <span>{formatPriceWithCurrency(amount, currency)}</span>
      <small>via {gateway === 'razorpay' ? 'Razorpay' : 'Stripe'}</small>
    </div>
  );
}

// ============================================
// EXAMPLE 3: Conditional Rendering Based on Gateway
// ============================================
export function PaymentMethodInfo() {
  const { gateway, country } = usePayment();

  return (
    <div>
      {gateway === 'razorpay' ? (
        <div>
          <p>Payment methods available in India:</p>
          <ul>
            <li>Credit/Debit Cards</li>
            <li>Net Banking</li>
            <li>UPI</li>
            <li>Wallets (Paytm, PhonePe, etc.)</li>
          </ul>
        </div>
      ) : (
        <div>
          <p>International payment methods:</p>
          <ul>
            <li>Credit/Debit Cards</li>
            <li>Apple Pay / Google Pay</li>
            <li>Bank Transfers</li>
          </ul>
        </div>
      )}
      <small>Detected location: {country}</small>
    </div>
  );
}
