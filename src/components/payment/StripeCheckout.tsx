'use client';

/**
 * PLACEHOLDER: Stripe Checkout Component
 * This is a placeholder for your colleague to implement Stripe integration
 *
 * TODO:
 * 1. Use @stripe/stripe-js and @stripe/react-stripe-js
 * 2. Create PaymentIntent on backend
 * 3. Use CardElement or PaymentElement
 * 4. Handle 3D Secure authentication
 * 5. Confirm payment and handle success/failure
 */

interface StripeCheckoutProps {
  amount: number; // in cents
  currency: string;
  type: 'course' | 'subscription';
  itemId: string;
  itemName: string;
  onSuccess: (paymentId: string) => void;
  onFailure: (error: string) => void;
}

export default function StripeCheckout({
  amount,
  currency,
  itemName,
  onSuccess,
  onFailure,
}: StripeCheckoutProps) {
  const handlePayment = () => {
    // TODO: Implement Stripe payment flow
    alert('Stripe integration coming soon! Your colleague will implement this.');
    onFailure('Stripe not yet implemented');
  };

  return (
    <div>
      <div
        style={{
          padding: '20px',
          background: '#f8f8f8',
          borderRadius: '8px',
          marginBottom: '16px',
          border: '2px dashed #ccc',
        }}
      >
        <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
          <strong>Stripe Integration Placeholder</strong>
        </p>
        <p style={{ fontSize: '12px', color: '#999' }}>
          This component will be implemented by your colleague. It should include:
        </p>
        <ul style={{ fontSize: '12px', color: '#999', marginTop: '8px', paddingLeft: '20px' }}>
          <li>Stripe Elements for card input</li>
          <li>PaymentIntent creation</li>
          <li>3D Secure handling</li>
          <li>Payment confirmation</li>
        </ul>
      </div>

      <button
        onClick={handlePayment}
        style={{
          width: '100%',
          padding: '16px',
          background: '#635bff',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        Pay {currency === 'USD' ? '$' : '€'}
        {(amount / 100).toFixed(2)} (Stripe - Coming Soon)
      </button>
    </div>
  );
}
