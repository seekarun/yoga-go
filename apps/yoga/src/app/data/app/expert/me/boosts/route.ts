import { NextResponse } from 'next/server';
import type { ApiResponse, Boost, BoostListResult } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as boostRepository from '@/lib/repositories/boostRepository';

/**
 * GET /data/app/expert/me/boosts
 * Get all boost campaigns for the current expert
 */
export async function GET(request: Request) {
  console.log('[DBG][boosts/route.ts] GET called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<BoostListResult>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<BoostListResult>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<BoostListResult>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);

    // Get boosts
    const result = await boostRepository.getBoostsByExpert(expertId, limit);

    console.log('[DBG][boosts/route.ts] Found', result.boosts.length, 'boosts');
    return NextResponse.json({ success: true, data: result } as ApiResponse<BoostListResult>);
  } catch (error) {
    console.error('[DBG][boosts/route.ts] Error fetching boosts:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch boosts',
      } as ApiResponse<BoostListResult>,
      { status: 500 }
    );
  }
}

/**
 * POST /data/app/expert/me/boosts
 * Create a new boost campaign from generated data
 * Body: { goal, courseId?, budget, currency, creative, targeting, initiatePayment? }
 *
 * Returns boost in "pending_payment" status - frontend shows payment form
 */
export async function POST(request: Request) {
  console.log('[DBG][boosts/route.ts] POST called');

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
    const { goal, courseId, budget, currency = 'USD', creative, targeting } = body;

    // Validate required fields
    if (!goal || !budget || !creative || !targeting) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' } as ApiResponse<Boost>,
        { status: 400 }
      );
    }

    // Validate budget
    if (budget < 1000) {
      return NextResponse.json(
        {
          success: false,
          error: 'Minimum budget is 1000 cents ($10 or Rs.10)',
        } as ApiResponse<Boost>,
        { status: 400 }
      );
    }

    // Create boost campaign in pending_payment status
    // Payment will be processed separately via payment modal
    const boost = await boostRepository.createBoost({
      expertId,
      goal,
      courseId,
      budget,
      currency,
      status: 'pending_payment',
      targeting,
      creative,
    });

    console.log('[DBG][boosts/route.ts] Boost created with pending_payment status:', boost.id);

    // Return boost data - frontend will show payment modal
    return NextResponse.json({
      success: true,
      data: boost,
    } as ApiResponse<Boost>);
  } catch (error) {
    console.error('[DBG][boosts/route.ts] Error creating boost:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create boost',
      } as ApiResponse<Boost>,
      { status: 500 }
    );
  }
}
