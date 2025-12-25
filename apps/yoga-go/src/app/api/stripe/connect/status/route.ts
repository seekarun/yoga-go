/**
 * Stripe Connect Status
 *
 * GET /api/stripe/connect/status
 * Returns the current Stripe Connect status for an expert.
 *
 * Query params:
 * - expertId (optional): If provided, returns status for that expert (public lookup for payments)
 *                        If not provided, returns status for authenticated expert
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as stripeConnect from '@/lib/stripe-connect';

export async function GET(request: NextRequest) {
  try {
    console.log('[DBG][stripe-connect-status] Status request received');

    const { searchParams } = new URL(request.url);
    const queryExpertId = searchParams.get('expertId');

    let expertId: string;

    if (queryExpertId) {
      // Public lookup for payment - anyone can check if an expert has Stripe connected
      expertId = queryExpertId;
      console.log('[DBG][stripe-connect-status] Public lookup for expert:', expertId);
    } else {
      // Authenticated expert checking their own status
      const session = await getSession();
      if (!session?.user?.cognitoSub) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      // Look up user to get expert profile
      const user = await getUserByCognitoSub(session.user.cognitoSub);
      if (!user?.expertProfile) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }

      expertId = user.expertProfile;
    }

    console.log('[DBG][stripe-connect-status] Looking up expert:', expertId);

    const expert = await expertRepository.getExpertById(expertId);
    console.log('[DBG][stripe-connect-status] Expert found:', !!expert);
    console.log('[DBG][stripe-connect-status] stripeConnect data:', expert?.stripeConnect);

    if (!expert?.stripeConnect?.accountId) {
      console.log('[DBG][stripe-connect-status] No Stripe account connected');
      return NextResponse.json({
        success: true,
        data: { connected: false, status: 'not_connected' },
      });
    }

    // Sync latest status from Stripe
    const status = await stripeConnect.syncAccountStatus(expertId);

    console.log('[DBG][stripe-connect-status] Status:', status?.status);

    return NextResponse.json({
      success: true,
      data: {
        connected: status?.status === 'active',
        ...status,
      },
    });
  } catch (error) {
    console.error('[DBG][stripe-connect-status] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get status' }, { status: 500 });
  }
}
