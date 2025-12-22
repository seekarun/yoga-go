/**
 * Stripe Connect Refresh
 *
 * GET /api/stripe/connect/refresh
 * Called when the onboarding link expires. Generates a new link and redirects.
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import * as stripeConnect from '@/lib/stripe-connect';

export async function GET(request: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111';

  try {
    console.log('[DBG][stripe-connect-refresh] Refresh request received');

    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    // Look up user to get expert profile
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.redirect(new URL('/auth/signin', baseUrl));
    }

    // Get expertId from query params (fallback) or session
    const url = new URL(request.url);
    const expertIdParam = url.searchParams.get('expertId');
    const expertId = expertIdParam || user.expertProfile;

    const expert = await expertRepository.getExpertById(expertId);
    if (!expert?.stripeConnect?.accountId) {
      console.log('[DBG][stripe-connect-refresh] No Stripe account found');
      return NextResponse.redirect(new URL(`/srv/${expertId}/settings?stripe=error`, baseUrl));
    }

    // Generate new onboarding link
    const onboardingUrl = await stripeConnect.refreshOnboardingLink(
      expertId,
      expert.stripeConnect.accountId
    );

    console.log('[DBG][stripe-connect-refresh] Redirecting to new onboarding link');

    return NextResponse.redirect(onboardingUrl);
  } catch (error) {
    console.error('[DBG][stripe-connect-refresh] Error:', error);
    return NextResponse.redirect(new URL('/srv?error=stripe_refresh_failed', baseUrl));
  }
}
