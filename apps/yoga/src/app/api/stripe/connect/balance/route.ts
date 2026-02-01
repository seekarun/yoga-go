/**
 * Stripe Connect Balance
 *
 * GET /api/stripe/connect/balance
 * Returns the balance for the authenticated expert's connected Stripe account.
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as stripeConnect from '@/lib/stripe-connect';

export async function GET() {
  try {
    console.log('[DBG][stripe-connect-balance] Balance request received');

    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Look up user to get expert profile
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const expertId = user.expertProfile;
    console.log('[DBG][stripe-connect-balance] Looking up expert:', expertId);

    const expert = await expertRepository.getExpertById(expertId);

    if (!expert?.stripeConnect?.accountId) {
      console.log('[DBG][stripe-connect-balance] No Stripe account connected');
      return NextResponse.json({
        success: true,
        data: { connected: false },
      });
    }

    if (expert.stripeConnect.status !== 'active') {
      console.log('[DBG][stripe-connect-balance] Stripe account not active');
      return NextResponse.json({
        success: true,
        data: { connected: true, active: false, status: expert.stripeConnect.status },
      });
    }

    // Fetch balance from Stripe
    const balance = await stripeConnect.getAccountBalance(expert.stripeConnect.accountId);

    console.log('[DBG][stripe-connect-balance] Balance retrieved:', balance);

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        active: true,
        balance,
      },
    });
  } catch (error) {
    console.error('[DBG][stripe-connect-balance] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get balance' }, { status: 500 });
  }
}
