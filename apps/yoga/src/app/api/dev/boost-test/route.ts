import { NextResponse } from 'next/server';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as boostRepository from '@/lib/repositories/boostRepository';
import * as boostService from '@/lib/boost-service';

/**
 * DEV ONLY - Test boost flow without real payment
 *
 * POST /api/dev/boost-test
 * Body: { boostId }
 *
 * This simulates a successful payment and submits to Meta
 */
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  console.log('[DBG][dev/boost-test] Test endpoint called');

  try {
    // Still require auth
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not an expert' }, { status: 403 });
    }

    const body = await request.json();
    const { boostId } = body;

    if (!boostId) {
      return NextResponse.json({ success: false, error: 'boostId is required' }, { status: 400 });
    }

    // Get boost
    const boost = await boostRepository.getBoostById(boostId);
    if (!boost) {
      return NextResponse.json({ success: false, error: 'Boost not found' }, { status: 404 });
    }

    // Verify ownership
    if (boost.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Not your boost' }, { status: 403 });
    }

    console.log('[DBG][dev/boost-test] Simulating payment for boost:', boostId);

    // Submit to Meta (this will create the campaign)
    const submittedBoost = await boostService.submitBoost(boostId);

    return NextResponse.json({
      success: true,
      message: 'Test boost submitted to Meta (payment simulated)',
      data: submittedBoost,
    });
  } catch (error) {
    console.error('[DBG][dev/boost-test] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Test failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/dev/boost-test?boostId=xxx
 * Quick test to check Meta connection and boost status
 */
export async function GET(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const boostId = searchParams.get('boostId');

  // If no boostId, just test Meta connection
  if (!boostId) {
    const metaConfigured = {
      META_APP_ID: !!process.env.META_APP_ID,
      META_APP_SECRET: !!process.env.META_APP_SECRET,
      META_ACCESS_TOKEN: !!process.env.META_ACCESS_TOKEN,
      META_AD_ACCOUNT_ID: !!process.env.META_AD_ACCOUNT_ID,
      META_PAGE_ID: !!process.env.META_PAGE_ID,
    };

    const allConfigured = Object.values(metaConfigured).every(Boolean);

    return NextResponse.json({
      success: true,
      message: allConfigured ? 'Meta Ads fully configured' : 'Missing Meta Ads config',
      config: metaConfigured,
    });
  }

  // Get boost status
  const boost = await boostRepository.getBoostById(boostId);
  if (!boost) {
    return NextResponse.json({ success: false, error: 'Boost not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: {
      id: boost.id,
      status: boost.status,
      statusMessage: boost.statusMessage,
      metaCampaignId: boost.metaCampaignId,
      metaAdSetId: boost.metaAdSetId,
      metaAdId: boost.metaAdId,
      budget: boost.budget,
      spentAmount: boost.spentAmount,
    },
  });
}
