import { NextResponse } from 'next/server';
import type { ApiResponse, Boost } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as boostRepository from '@/lib/repositories/boostRepository';
import * as boostService from '@/lib/boost-service';

interface RouteParams {
  params: Promise<{ boostId: string }>;
}

/**
 * POST /data/app/expert/me/boosts/[boostId]/resume
 * Resume a paused boost campaign
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { boostId } = await params;
  console.log('[DBG][boosts/resume/route.ts] POST called for:', boostId);

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

    // Get boost to verify ownership
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

    // Resume boost
    const updatedBoost = await boostService.resumeBoost(boostId);

    console.log('[DBG][boosts/resume/route.ts] Boost resumed:', boostId);
    return NextResponse.json({ success: true, data: updatedBoost } as ApiResponse<Boost>);
  } catch (error) {
    console.error('[DBG][boosts/resume/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resume boost',
      } as ApiResponse<Boost>,
      { status: 500 }
    );
  }
}
