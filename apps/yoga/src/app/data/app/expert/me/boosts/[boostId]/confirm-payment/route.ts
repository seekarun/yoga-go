import { NextResponse } from 'next/server';
import type { ApiResponse, Boost } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as boostRepository from '@/lib/repositories/boostRepository';
import * as paymentRepository from '@/lib/repositories/paymentRepository';
import * as boostService from '@/lib/boost-service';

interface RouteParams {
  params: Promise<{ boostId: string }>;
}

/**
 * POST /data/app/expert/me/boosts/[boostId]/confirm-payment
 * Confirm payment for a boost campaign and update status to pending_approval
 * Body: { paymentId, gateway }
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { boostId } = await params;
  console.log('[DBG][confirm-payment/route.ts] POST called for boost:', boostId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Boost>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Boost>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Boost>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse request body
    const body = await request.json();
    const { paymentId, gateway } = body;

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: 'Payment ID is required' } as ApiResponse<Boost>,
        { status: 400 }
      );
    }

    // Get boost
    const boost = await boostRepository.getBoostById(boostId);

    if (!boost) {
      return NextResponse.json({ success: false, error: 'Boost not found' } as ApiResponse<Boost>, {
        status: 404,
      });
    }

    // Verify boost belongs to expert
    if (boost.expertId !== expertId) {
      return NextResponse.json(
        { success: false, error: 'Boost does not belong to this expert' } as ApiResponse<Boost>,
        { status: 403 }
      );
    }

    // Verify boost is in pending_payment status
    if (boost.status !== 'pending_payment') {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot confirm payment for boost with status: ${boost.status}`,
        } as ApiResponse<Boost>,
        { status: 400 }
      );
    }

    // Record the payment
    const now = new Date().toISOString();
    try {
      await paymentRepository.createPayment({
        userId: user.id,
        itemType: 'boost_campaign',
        itemId: boostId,
        amount: boost.budget,
        currency: boost.currency,
        gateway: gateway || 'stripe',
        status: 'succeeded',
        paymentIntentId: paymentId,
        initiatedAt: now,
        completedAt: now,
        metadata: {
          expertId,
          boostGoal: boost.goal,
        },
      });
      console.log('[DBG][confirm-payment/route.ts] Payment record created');
    } catch (paymentErr) {
      console.error('[DBG][confirm-payment/route.ts] Failed to create payment record:', paymentErr);
      // Continue anyway - the payment was successful, don't block the boost
    }

    // Submit boost to Meta Ads
    // This will create the campaign on Meta and update status to pending_approval
    let finalBoost: Boost;
    try {
      finalBoost = await boostService.submitBoost(boostId);
      console.log('[DBG][confirm-payment/route.ts] Boost submitted to Meta');
    } catch (submitErr) {
      console.error('[DBG][confirm-payment/route.ts] Meta submission failed:', submitErr);
      // Mark as failed so user can delete and retry
      const updatedBoost = await boostRepository.updateBoostStatus(boostId, 'failed', {
        statusMessage: submitErr instanceof Error ? submitErr.message : 'Meta submission failed',
      });
      finalBoost = updatedBoost as Boost;
    }

    return NextResponse.json({
      success: true,
      data: finalBoost,
    } as ApiResponse<Boost>);
  } catch (error) {
    console.error('[DBG][confirm-payment/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to confirm payment',
      } as ApiResponse<Boost>,
      { status: 500 }
    );
  }
}
