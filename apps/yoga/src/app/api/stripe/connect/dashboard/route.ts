/**
 * Stripe Connect Dashboard Link
 *
 * POST /api/stripe/connect/dashboard
 * Generates a login link to the expert's Stripe Express dashboard.
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as stripeConnect from '@/lib/stripe-connect';

export async function POST() {
  try {
    console.log('[DBG][stripe-connect-dashboard] Dashboard link request received');

    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Look up user to get expert profile
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const expertId = user.expertProfile;
    const expert = await expertRepository.getExpertById(expertId);

    if (!expert?.stripeConnect?.accountId) {
      return NextResponse.json(
        { success: false, error: 'Stripe account not connected' },
        { status: 400 }
      );
    }

    const dashboardUrl = await stripeConnect.createDashboardLink(expert.stripeConnect.accountId);

    console.log('[DBG][stripe-connect-dashboard] Dashboard link generated');

    return NextResponse.json({
      success: true,
      data: { url: dashboardUrl },
    });
  } catch (error) {
    console.error('[DBG][stripe-connect-dashboard] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create dashboard link' },
      { status: 500 }
    );
  }
}
