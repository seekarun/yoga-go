# Payment Integration Setup Guide

## Overview

This project uses **Razorpay** for Indian users and **Stripe** for international users. The system automatically detects user location and routes to the appropriate gateway.

## Phase 1: Razorpay Integration ✅ COMPLETE

### What's Implemented

1. **✅ Geolocation Service** (`src/lib/geolocation.ts`)
   - Detects user country via IP
   - Falls back to timezone heuristic
   - Selects appropriate payment gateway

2. **✅ Payment Context** (`src/contexts/PaymentContext.tsx`)
   - Global state for gateway selection
   - Currency management (INR/USD)
   - Location detection on app load

3. **✅ Razorpay Checkout** (`src/components/payment/RazorpayCheckout.tsx`)
   - Loads Razorpay SDK dynamically
   - Creates orders via backend
   - Handles payment success/failure
   - Verifies payment signature

4. **✅ Payment Modal** (`src/components/payment/PaymentModal.tsx`)
   - Unified interface for both gateways
   - Shows appropriate checkout based on location
   - Success/error states
   - Redirects after payment

5. **✅ API Routes**
   - `POST /api/payment/razorpay/create-order` - Create Razorpay order
   - `POST /api/payment/razorpay/verify` - Verify payment signature
   - `POST /api/webhooks/razorpay` - Handle Razorpay webhooks

6. **✅ Stripe Placeholder** (`src/components/payment/StripeCheckout.tsx`)
   - Ready for your colleague to implement
   - Clear TODO comments
   - Same interface as Razorpay component

## Setup Instructions

### 1. Install Dependencies ✅ DONE

```bash
npm install razorpay stripe @stripe/stripe-js @stripe/react-stripe-js
```

### 2. Get Razorpay API Keys

1. Sign up at [https://razorpay.com](https://razorpay.com)
2. Go to Dashboard > Settings > API Keys
3. Generate Test Keys (for development)
4. Copy Key ID and Key Secret

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Razorpay (Required for Phase 1)
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# Stripe (For your colleague - Phase 2)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**⚠️ IMPORTANT:**

- Never commit `.env.local` to git
- Use Test keys for development
- Switch to Live keys only in production

### 4. Test the Integration

#### Test Cards for Razorpay:

**Success:**

- Card: `4111 1111 1111 1111`
- CVV: Any 3 digits
- Expiry: Any future date

**Failure:**

- Card: `4000 0000 0000 0002`

**3D Secure:**

- Card: `5104 0600 0000 0008`

#### Test the Flow:

1. Start dev server: `npm run dev`
2. Navigate to a course page
3. Click "Enroll Now" (button to be added)
4. Payment modal should open
5. It should detect your location
6. If in India → Shows Razorpay
7. If outside India → Shows Stripe placeholder
8. Complete payment with test card
9. Should redirect to course on success

### 5. Setup Razorpay Webhooks (Production)

1. Go to Razorpay Dashboard > Settings > Webhooks
2. Add webhook URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `subscription.charged`
   - `subscription.cancelled`
4. Save webhook secret (not needed for test mode)

## Usage in Components

### Example: Add Payment to Course Card

```typescript
'use client';

import { useState } from 'react';
import PaymentModal from '@/components/payment/PaymentModal';

export default function CourseCard({ course }) {
  const [showPayment, setShowPayment] = useState(false);

  return (
    <>
      <button onClick={() => setShowPayment(true)}>
        Enroll Now - ${course.price}
      </button>

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
    </>
  );
}
```

### Example: Add Payment to Pricing Page

```typescript
<PaymentModal
  isOpen={showPayment}
  onClose={() => setShowPayment(false)}
  type="subscription"
  item={{
    id: 'curious', // or 'committed'
    title: 'Curious Plan',
    planType: 'curious',
  }}
/>
```

## What's Next (TODO)

### Database Integration

Currently, the API routes have TODO comments for database operations:

```typescript
// TODO: Store payment in database
// TODO: Create enrollment record
// TODO: Update user membership
// TODO: Send confirmation email
```

You'll need to:

1. Set up a database (PostgreSQL, MongoDB, etc.)
2. Create tables for:
   - `payments` - Store all transactions
   - `enrollments` - Course enrollments
   - `subscriptions` - Active subscriptions
3. Implement the TODO sections in API routes

### Stripe Integration (For Your Colleague)

File to implement: `src/components/payment/StripeCheckout.tsx`

Steps:

1. Use `@stripe/react-stripe-js` and `@stripe/stripe-js`
2. Create PaymentIntent on backend
3. Use `CardElement` or `PaymentElement`
4. Handle 3D Secure authentication
5. Confirm payment
6. Create similar API routes:
   - `/api/payment/stripe/create-payment-intent`
   - `/api/payment/stripe/verify`
   - `/api/webhooks/stripe`

Reference: [Stripe React Documentation](https://stripe.com/docs/stripe-js/react)

## Testing Checklist

- [ ] Razorpay payment with test card succeeds
- [ ] Payment failure is handled gracefully
- [ ] Location detection works (test with VPN)
- [ ] Payment modal opens and closes
- [ ] Success redirect works
- [ ] Error messages display correctly
- [ ] Webhook signature verification works
- [ ] Console logs show payment flow

## Security Notes

✅ **What's Secure:**

- Payment signature verification on backend
- No card details stored
- Razorpay SDK handles sensitive data
- Webhook signature validation

⚠️ **What Needs Attention:**

- Add rate limiting to payment endpoints
- Implement idempotency for webhooks
- Add CAPTCHA for suspicious activity
- Log all payment attempts for audit

## Troubleshooting

### "Payment gateway not loaded"

- Check if Razorpay script is blocked by ad blocker
- Verify NEXT_PUBLIC_RAZORPAY_KEY_ID is set

### "Failed to create order"

- Check RAZORPAY_KEY_SECRET is correct
- Verify API keys are for the right mode (test/live)
- Check server logs for detailed error

### "Payment verification failed"

- Signature mismatch - check key secret
- Order might have expired (valid for 15 mins)

### Location detection not working

- ipapi.co might be rate limited (free tier: 1000/day)
- Falls back to timezone detection
- Can manually set country for testing

## Cost Estimates

### Razorpay Fees (India)

- 2% + GST per transaction
- No setup or monthly fees
- Example: ₹249 course = ₹5 fee

### Stripe Fees (International)

- 2.9% + $0.30 per transaction
- No setup or monthly fees
- Example: $299 subscription = ~$9 fee

## Support

- Razorpay Docs: https://razorpay.com/docs/
- Stripe Docs: https://stripe.com/docs
- Test Cards: https://razorpay.com/docs/payments/payments/test-card-details/

## Production Checklist

Before going live:

- [ ] Switch to Live API keys
- [ ] Set up webhook endpoints
- [ ] Test with real cards (small amounts)
- [ ] Enable webhook signature verification
- [ ] Set up payment monitoring/alerts
- [ ] Add database persistence
- [ ] Implement email notifications
- [ ] Add analytics tracking
- [ ] Security audit
- [ ] Load testing
