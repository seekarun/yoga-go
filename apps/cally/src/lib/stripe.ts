/**
 * Stripe Client Library for CallyGo
 * Handles Stripe Connect operations and platform subscription billing
 */
import Stripe from "stripe";
import type { SubscriptionTier } from "@/types/subscription";

let stripeInstance: Stripe | null = null;

/**
 * Get singleton Stripe client
 */
export function getStripeClient(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is not set");
    }
    stripeInstance = new Stripe(key);
  }
  return stripeInstance;
}

/**
 * Create a Stripe Express connected account
 */
export async function createConnectedAccount(
  email: string,
): Promise<Stripe.Account> {
  console.log("[DBG][stripe] Creating connected account for email:", email);
  const stripe = getStripeClient();
  return stripe.accounts.create({
    type: "express",
    email,
  });
}

/**
 * Create an account link for Stripe onboarding
 */
export async function createAccountLink(
  accountId: string,
  tenantId: string,
): Promise<Stripe.AccountLink> {
  console.log("[DBG][stripe] Creating account link for account:", accountId);
  const stripe = getStripeClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://proj-cally.vercel.app";

  return stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${baseUrl}/api/data/app/stripe/refresh?tenantId=${tenantId}`,
    return_url: `${baseUrl}/api/data/app/stripe/callback?tenantId=${tenantId}`,
    type: "account_onboarding",
  });
}

/**
 * Get connected account status from Stripe
 */
export async function getAccountStatus(accountId: string): Promise<{
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  email: string | null;
}> {
  console.log("[DBG][stripe] Getting account status for:", accountId);
  const stripe = getStripeClient();
  const account = await stripe.accounts.retrieve(accountId);

  return {
    chargesEnabled: account.charges_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    email: account.email ?? null,
  };
}

/**
 * Create a Stripe Checkout Session with destination charge
 */
export async function createCheckoutSession(params: {
  connectedAccountId: string;
  currency: string;
  unitAmount: number; // in smallest currency unit (cents)
  productName: string;
  tenantName: string;
  applicationFeeAmount: number; // in smallest currency unit (cents)
  customerEmail: string;
  returnUrl: string;
  metadata: Record<string, string>;
}): Promise<Stripe.Checkout.Session> {
  console.log(
    "[DBG][stripe] Creating embedded checkout session for account:",
    params.connectedAccountId,
  );
  const stripe = getStripeClient();

  return stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: params.currency,
          unit_amount: params.unitAmount,
          product_data: {
            name: params.productName,
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      application_fee_amount: params.applicationFeeAmount,
      transfer_data: {
        destination: params.connectedAccountId,
      },
    },
    customer_email: params.customerEmail,
    return_url: params.returnUrl,
    custom_text: {
      submit: {
        message: `Booking with ${params.tenantName}`,
      },
    },
    expires_at: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
    metadata: params.metadata,
  });
}

/**
 * Construct and verify a Stripe webhook event
 */
export function constructWebhookEvent(
  body: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET environment variable is not set");
  }
  return stripe.webhooks.constructEvent(body, signature, secret);
}

/**
 * Retrieve a Checkout Session by ID
 */
export async function getCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  return stripe.checkout.sessions.retrieve(sessionId);
}

/**
 * Expire a Checkout Session (immediately cancels it)
 */
export async function expireCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  console.log("[DBG][stripe] Expiring checkout session:", sessionId);
  const stripe = getStripeClient();
  return stripe.checkout.sessions.expire(sessionId);
}

/**
 * Retrieve a PaymentIntent by ID
 */
export async function getPaymentIntent(
  paymentIntentId: string,
): Promise<Stripe.PaymentIntent> {
  console.log("[DBG][stripe] Retrieving payment intent:", paymentIntentId);
  const stripe = getStripeClient();
  return stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Create a full refund for a payment intent
 * For Connect destination charges, Stripe auto-reverses the transfer proportionally.
 */
export async function createFullRefund(
  paymentIntentId: string,
): Promise<Stripe.Refund> {
  console.log(
    "[DBG][stripe] Creating full refund for payment intent:",
    paymentIntentId,
  );
  const stripe = getStripeClient();
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}

/**
 * Create a partial refund for a payment intent
 * For Connect destination charges, Stripe auto-reverses the transfer proportionally.
 */
export async function createPartialRefund(
  paymentIntentId: string,
  amountCents: number,
): Promise<Stripe.Refund> {
  console.log(
    "[DBG][stripe] Creating partial refund for payment intent:",
    paymentIntentId,
    "amount:",
    amountCents,
  );
  const stripe = getStripeClient();
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount: amountCents,
  });
}

// ===================================================================
// SUBSCRIPTION BILLING (platform subscriptions, not Connect)
// ===================================================================

/**
 * Get Stripe Price ID for a subscription tier from env vars
 */
export function getStripePriceId(tier: SubscriptionTier): string {
  const priceMap: Record<SubscriptionTier, string | undefined> = {
    starter: process.env.STRIPE_PRICE_STARTER,
    professional: process.env.STRIPE_PRICE_PROFESSIONAL,
    business: process.env.STRIPE_PRICE_BUSINESS,
  };
  const priceId = priceMap[tier];
  if (!priceId) {
    throw new Error(
      `STRIPE_PRICE_${tier.toUpperCase()} environment variable is not set`,
    );
  }
  return priceId;
}

/**
 * Get trial period days for a subscription tier
 */
export function getTrialDays(tier: SubscriptionTier): number {
  return tier === "starter" ? 180 : 30;
}

/**
 * Get or create a Stripe Customer for a tenant
 */
export async function getOrCreateCustomer(params: {
  tenantId: string;
  email: string;
  name: string;
  existingCustomerId?: string;
}): Promise<Stripe.Customer> {
  const stripe = getStripeClient();

  if (params.existingCustomerId) {
    console.log(
      "[DBG][stripe] Retrieving existing customer:",
      params.existingCustomerId,
    );
    return stripe.customers.retrieve(
      params.existingCustomerId,
    ) as Promise<Stripe.Customer>;
  }

  console.log(
    "[DBG][stripe] Creating new customer for tenant:",
    params.tenantId,
  );
  return stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: { tenantId: params.tenantId },
  });
}

/**
 * Create a Stripe Checkout Session for subscription billing
 */
export async function createSubscriptionCheckout(params: {
  customerId: string;
  priceId: string;
  trialDays: number;
  tenantId: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  console.log(
    "[DBG][stripe] Creating subscription checkout for tier:",
    params.tier,
  );
  const stripe = getStripeClient();

  return stripe.checkout.sessions.create({
    mode: "subscription",
    customer: params.customerId,
    line_items: [{ price: params.priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: params.trialDays,
      metadata: { tenantId: params.tenantId, tier: params.tier },
    },
    metadata: { tenantId: params.tenantId, tier: params.tier },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
}

/**
 * Create a Stripe Customer Portal session for billing management
 */
export async function createCustomerPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  console.log(
    "[DBG][stripe] Creating customer portal session for:",
    params.customerId,
  );
  const stripe = getStripeClient();

  return stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });
}

/**
 * Retrieve a Stripe Subscription by ID
 */
export async function getSubscription(
  subscriptionId: string,
): Promise<Stripe.Subscription> {
  console.log("[DBG][stripe] Retrieving subscription:", subscriptionId);
  const stripe = getStripeClient();
  return stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Construct and verify a Stripe webhook event for subscription events
 * Uses a separate webhook secret from the Connect/booking webhook
 */
export function constructSubscriptionWebhookEvent(
  body: string,
  signature: string,
): Stripe.Event {
  const stripe = getStripeClient();
  const secret = process.env.STRIPE_SUBSCRIPTION_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_SUBSCRIPTION_WEBHOOK_SECRET environment variable is not set",
    );
  }
  return stripe.webhooks.constructEvent(body, signature, secret);
}
