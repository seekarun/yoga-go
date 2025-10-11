export const PAYMENT_CONFIG = {
  razorpay: {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    currency: 'INR',
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    currency: 'USD',
  },
  plans: {
    curious: {
      name: 'Curious Plan',
      description: 'One course token per month',
      inr: 24999, // ₹249.99 (in paise)
      usd: 29900, // $299.00 (in cents)
      interval: 'yearly',
    },
    committed: {
      name: 'Committed Plan',
      description: 'Unlimited access to all courses',
      inr: 49999, // ₹499.99 (in paise)
      usd: 59900, // $599.00 (in cents)
      interval: 'yearly',
    },
  },
} as const;

export type PaymentGateway = 'razorpay' | 'stripe';
export type PlanType = 'curious' | 'committed';
export type PaymentType = 'course' | 'subscription';
