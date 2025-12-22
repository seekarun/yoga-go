/**
 * Create Stripe Connect Account
 *
 * POST /api/stripe/connect/create-account
 * Creates a Stripe Connect Express account for an expert and returns the onboarding URL.
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as stripeConnect from '@/lib/stripe-connect';

export async function POST(request: Request) {
  try {
    console.log('[DBG][stripe-connect-api] Create account request received');

    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Look up user to get expert profile
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Expert profile required' },
        { status: 401 }
      );
    }

    const expertId = user.expertProfile;
    const body = await request.json();
    const { country = 'US' } = body;

    // Get expert details
    const expert = await expertRepository.getExpertById(expertId);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    // Check if already has an account
    if (expert.stripeConnect?.accountId) {
      // If pending or restricted, generate new onboarding link
      if (
        expert.stripeConnect.status === 'pending' ||
        expert.stripeConnect.status === 'restricted'
      ) {
        console.log('[DBG][stripe-connect-api] Refreshing onboarding link for existing account');
        const url = await stripeConnect.refreshOnboardingLink(
          expertId,
          expert.stripeConnect.accountId
        );
        return NextResponse.json({
          success: true,
          data: { onboardingUrl: url, existing: true },
        });
      }

      // Already fully connected
      if (expert.stripeConnect.status === 'active') {
        return NextResponse.json(
          { success: false, error: 'Stripe account already connected' },
          { status: 400 }
        );
      }
    }

    // Get email from expert or user profile
    const email =
      expert.platformPreferences?.customEmail ||
      expert.platformPreferences?.defaultEmail ||
      user.profile?.email;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email required for Stripe Connect' },
        { status: 400 }
      );
    }

    // Create new account
    const result = await stripeConnect.createConnectAccount(expertId, email, country);

    console.log('[DBG][stripe-connect-api] Account created, returning onboarding URL');

    return NextResponse.json({
      success: true,
      data: { onboardingUrl: result.onboardingUrl },
    });
  } catch (error) {
    console.error('[DBG][stripe-connect-api] Error creating account:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create Stripe account',
      },
      { status: 500 }
    );
  }
}
