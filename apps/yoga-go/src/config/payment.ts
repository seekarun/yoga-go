export const PAYMENT_CONFIG = {
  razorpay: {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    currency: 'INR',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
  },
  stripe: {
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    currency: 'USD',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  },
  // Stripe Connect for expert payouts
  stripeConnect: {
    platformFeePercent: 5, // 5% platform commission
  },
  plans: {
    curious: {
      name: 'Curious Plan',
      description: '12 course tokens per year (1 per month)',
      monthly: {
        inr: 29900, // ₹299/month (in paise)
        usd: 3500, // $35/month (in cents)
        interval: 'monthly' as const,
        // Stripe Price IDs (set these in .env after creating in Stripe Dashboard)
        stripePriceIdInr: process.env.STRIPE_CURIOUS_MONTHLY_INR_PRICE_ID || '',
        stripePriceIdUsd: process.env.STRIPE_CURIOUS_MONTHLY_USD_PRICE_ID || '',
        // Razorpay Plan IDs (set these in .env after creating in Razorpay Dashboard)
        razorpayPlanIdInr: process.env.RAZORPAY_CURIOUS_MONTHLY_INR_PLAN_ID || '',
      },
      yearly: {
        inr: 249900, // ₹2,499/year (in paise) - ~₹208/month effective
        usd: 29900, // $299/year (in cents) - ~$25/month effective
        interval: 'yearly' as const,
        stripePriceIdInr: process.env.STRIPE_CURIOUS_YEARLY_INR_PRICE_ID || '',
        stripePriceIdUsd: process.env.STRIPE_CURIOUS_YEARLY_USD_PRICE_ID || '',
        razorpayPlanIdInr: process.env.RAZORPAY_CURIOUS_YEARLY_INR_PLAN_ID || '',
      },
    },
    committed: {
      name: 'Committed Plan',
      description: 'Unlimited access to all courses',
      monthly: {
        inr: 69900, // ₹699/month (in paise)
        usd: 6900, // $69/month (in cents)
        interval: 'monthly' as const,
        stripePriceIdInr: process.env.STRIPE_COMMITTED_MONTHLY_INR_PRICE_ID || '',
        stripePriceIdUsd: process.env.STRIPE_COMMITTED_MONTHLY_USD_PRICE_ID || '',
        razorpayPlanIdInr: process.env.RAZORPAY_COMMITTED_MONTHLY_INR_PLAN_ID || '',
      },
      yearly: {
        inr: 499900, // ₹4,999/year (in paise) - ~₹417/month effective
        usd: 59900, // $599/year (in cents) - ~$50/month effective
        interval: 'yearly' as const,
        stripePriceIdInr: process.env.STRIPE_COMMITTED_YEARLY_INR_PRICE_ID || '',
        stripePriceIdUsd: process.env.STRIPE_COMMITTED_YEARLY_USD_PRICE_ID || '',
        razorpayPlanIdInr: process.env.RAZORPAY_COMMITTED_YEARLY_INR_PLAN_ID || '',
      },
    },
  },
} as const;

export type PaymentGateway = 'razorpay' | 'stripe';
export type PlanType = 'curious' | 'committed';
export type BillingInterval = 'monthly' | 'yearly';
export type PaymentType = 'course';
