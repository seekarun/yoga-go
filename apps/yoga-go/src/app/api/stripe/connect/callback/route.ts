/**
 * Stripe Connect Callback
 *
 * GET /api/stripe/connect/callback
 * Handles the return from Stripe onboarding, syncs account status, and redirects to settings.
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as stripeConnect from '@/lib/stripe-connect';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';

  try {
    console.log('[DBG][stripe-connect-callback] Callback received');

    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      console.log('[DBG][stripe-connect-callback] No session, redirecting to login');
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    // Look up user to get expert profile
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      console.log('[DBG][stripe-connect-callback] No expert profile, redirecting to login');
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    const expertId = user.expertProfile;

    // Sync account status from Stripe
    const status = await stripeConnect.syncAccountStatus(expertId);

    console.log('[DBG][stripe-connect-callback] Account status:', status?.status);

    // Redirect based on status
    if (status?.status === 'active') {
      return NextResponse.redirect(new URL(`/srv/${expertId}/settings?stripe=connected`, baseUrl));
    } else if (status?.status === 'pending' || status?.status === 'restricted') {
      return NextResponse.redirect(new URL(`/srv/${expertId}/settings?stripe=pending`, baseUrl));
    } else {
      return NextResponse.redirect(new URL(`/srv/${expertId}/settings?stripe=error`, baseUrl));
    }
  } catch (error) {
    console.error('[DBG][stripe-connect-callback] Error:', error);
    return NextResponse.redirect(new URL('/srv?error=stripe_connect_failed', baseUrl));
  }
}
