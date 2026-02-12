/**
 * Stripe Client Library for Cally
 * Handles Stripe Connect operations: account creation, onboarding, checkout sessions, webhooks
 */
import Stripe from "stripe";

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
