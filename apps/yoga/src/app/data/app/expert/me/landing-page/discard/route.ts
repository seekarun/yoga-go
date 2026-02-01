import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

/**
 * POST /data/app/expert/me/landing-page/discard
 * Discard draft landing page changes and reset to published version
 */
export async function POST() {
  console.log('[DBG][landing-page/discard] POST called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][landing-page/discard] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][landing-page/discard] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][landing-page/discard] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    // Discard draft and reset to published version
    const updatedExpert = await expertRepository.discardDraftLandingPage(user.expertProfile);

    console.log('[DBG][landing-page/discard] Draft discarded, reset to published version');

    return NextResponse.json({
      success: true,
      data: updatedExpert,
      message: 'Draft changes discarded',
    } as ApiResponse<Expert>);
  } catch (error) {
    console.error('[DBG][landing-page/discard] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to discard draft',
      } as ApiResponse<Expert>,
      { status: 500 }
    );
  }
}
