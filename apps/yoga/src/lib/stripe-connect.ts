/**
 * Stripe Connect Service
 *
 * Handles Stripe Connect Express accounts for expert payouts.
 * Experts receive 95% of course payments instantly, platform takes 5%.
 */

import Stripe from 'stripe';
import { PAYMENT_CONFIG } from '@/config/payment';
import * as expertRepository from '@/lib/repositories/expertRepository';
import type { StripeConnectStatus, StripeConnectDetails } from '@/types';

function getStripeInstance(): Stripe {
  if (!PAYMENT_CONFIG.stripe.secretKey) {
    throw new Error('Stripe secret key not configured');
  }
  return new Stripe(PAYMENT_CONFIG.stripe.secretKey, {
    apiVersion: '2025-10-29.clover',
  });
}

/**
 * Create a Stripe Connect Express account for an expert
 */
export async function createConnectAccount(
  expertId: string,
  email: string,
  country: string = 'US'
): Promise<{ accountId: string; onboardingUrl: string }> {
  console.log('[DBG][stripe-connect] Creating Express account for expert:', expertId);

  const stripe = getStripeInstance();

  // Create Express account
  const account = await stripe.accounts.create({
    type: 'express',
    country,
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    metadata: {
      expertId,
      platform: 'yoga-go',
    },
  });

  console.log('[DBG][stripe-connect] Express account created:', account.id);

  // Store account ID in database
  await expertRepository.updateStripeConnect(expertId, {
    accountId: account.id,
    status: 'pending',
    chargesEnabled: false,
    payoutsEnabled: false,
    lastUpdatedAt: new Date().toISOString(),
    country,
    email,
  });

  // Generate onboarding link
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl}/api/stripe/connect/refresh?expertId=${expertId}`,
    return_url: `${baseUrl}/api/stripe/connect/callback`,
    type: 'account_onboarding',
  });

  console.log('[DBG][stripe-connect] Onboarding link generated');

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Generate a new onboarding link for an existing account
 */
export async function refreshOnboardingLink(
  expertId: string,
  stripeAccountId: string
): Promise<string> {
  console.log('[DBG][stripe-connect] Refreshing onboarding link:', stripeAccountId);

  const stripe = getStripeInstance();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${baseUrl}/api/stripe/connect/refresh?expertId=${expertId}`,
    return_url: `${baseUrl}/api/stripe/connect/callback`,
    type: 'account_onboarding',
  });

  return accountLink.url;
}

/**
 * Check and update account status from Stripe
 */
export async function syncAccountStatus(expertId: string): Promise<StripeConnectDetails | null> {
  console.log('[DBG][stripe-connect] Syncing account status for expert:', expertId);

  const expert = await expertRepository.getExpertById(expertId);
  if (!expert?.stripeConnect?.accountId) {
    return null;
  }

  const stripe = getStripeInstance();
  const account = await stripe.accounts.retrieve(expert.stripeConnect.accountId);

  // Map Stripe status to our status
  let status: StripeConnectStatus = 'pending';
  if (account.charges_enabled && account.payouts_enabled) {
    status = 'active';
  } else if (account.requirements?.disabled_reason) {
    status = 'disabled';
  } else if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
    status = 'restricted';
  }

  const connectDetails: StripeConnectDetails = {
    accountId: account.id,
    status,
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    onboardingCompletedAt:
      status === 'active' && !expert.stripeConnect.onboardingCompletedAt
        ? new Date().toISOString()
        : expert.stripeConnect.onboardingCompletedAt,
    lastUpdatedAt: new Date().toISOString(),
    email: account.email ?? undefined,
    country: account.country ?? undefined,
  };

  await expertRepository.updateStripeConnect(expertId, connectDetails);

  console.log('[DBG][stripe-connect] Account status synced:', status);

  return connectDetails;
}

/**
 * Generate Stripe Express Dashboard login link
 */
export async function createDashboardLink(stripeAccountId: string): Promise<string> {
  console.log('[DBG][stripe-connect] Creating dashboard link:', stripeAccountId);

  const stripe = getStripeInstance();

  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);

  return loginLink.url;
}

/**
 * Calculate platform fee for a given amount
 * @param amountCents - Amount in cents
 * @returns Platform fee in cents (5% of amount)
 */
export function calculatePlatformFee(amountCents: number): number {
  const feePercent = PAYMENT_CONFIG.stripeConnect.platformFeePercent;
  return Math.round(amountCents * (feePercent / 100));
}

/**
 * Check if expert can receive payments
 */
export async function canReceivePayments(expertId: string): Promise<boolean> {
  const expert = await expertRepository.getExpertById(expertId);
  return (
    expert?.stripeConnect?.status === 'active' && expert?.stripeConnect?.chargesEnabled === true
  );
}

/**
 * Get expert's Stripe Connect status
 */
export async function getConnectStatus(expertId: string): Promise<StripeConnectDetails | null> {
  const expert = await expertRepository.getExpertById(expertId);
  return expert?.stripeConnect ?? null;
}

/**
 * Get account balance for a connected account
 */
export interface StripeBalance {
  available: { amount: number; currency: string }[];
  pending: { amount: number; currency: string }[];
}

export async function getAccountBalance(stripeAccountId: string): Promise<StripeBalance> {
  console.log('[DBG][stripe-connect] Fetching balance for account:', stripeAccountId);

  const stripe = getStripeInstance();

  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  });

  return {
    available: balance.available.map(b => ({
      amount: b.amount,
      currency: b.currency.toUpperCase(),
    })),
    pending: balance.pending.map(b => ({
      amount: b.amount,
      currency: b.currency.toUpperCase(),
    })),
  };
}
