import { NextResponse } from 'next/server';
import type { ApiResponse, Boost } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as boostRepository from '@/lib/repositories/boostRepository';

interface RouteParams {
  params: Promise<{ boostId: string }>;
}

/**
 * GET /data/app/expert/me/boosts/[boostId]
 * Get a specific boost campaign
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { boostId } = await params;
  console.log('[DBG][boosts/[boostId]/route.ts] GET called for:', boostId);

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

    console.log('[DBG][boosts/[boostId]/route.ts] Returning boost:', boost.id);
    return NextResponse.json({ success: true, data: boost } as ApiResponse<Boost>);
  } catch (error) {
    console.error('[DBG][boosts/[boostId]/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get boost',
      } as ApiResponse<Boost>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /data/app/expert/me/boosts/[boostId]
 * Delete a draft boost campaign
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  const { boostId } = await params;
  console.log('[DBG][boosts/[boostId]/route.ts] DELETE called for:', boostId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const expertId = user.expertProfile;

    // Get boost
    const boost = await boostRepository.getBoostById(boostId);

    if (!boost) {
      return NextResponse.json({ success: false, error: 'Boost not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Verify boost belongs to expert
    if (boost.expertId !== expertId) {
      return NextResponse.json(
        { success: false, error: 'Boost does not belong to this expert' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Can only delete boosts that haven't been submitted to Meta
    const deletableStatuses = ['draft', 'pending_payment', 'failed'];
    if (!deletableStatuses.includes(boost.status)) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot delete boost with status: ${boost.status}. Only draft, pending_payment, and failed boosts can be deleted.`,
        } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Delete the boost
    await boostRepository.deleteBoost(boostId, expertId);
    console.log('[DBG][boosts/[boostId]/route.ts] Boost deleted:', boostId);

    return NextResponse.json({ success: true, data: null } as ApiResponse<null>);
  } catch (error) {
    console.error('[DBG][boosts/[boostId]/route.ts] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete boost',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
