import { NextResponse } from 'next/server';
import type { ApiResponse, Expert } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';

/**
 * POST /data/app/expert/me/publish
 * Publish expert landing page (make it visible to public)
 *
 * Body: { publish: boolean }
 */
export async function POST(request: Request) {
  console.log('[DBG][expert/me/publish] POST called');

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      console.log('[DBG][expert/me/publish] Unauthorized - no session');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<Expert>, {
        status: 401,
      });
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      console.log('[DBG][expert/me/publish] User not found');
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<Expert>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      console.log('[DBG][expert/me/publish] User is not an expert');
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    // Get expert to check if flagged for review
    const expert = await expertRepository.getExpertById(user.expertProfile);
    if (!expert) {
      console.log('[DBG][expert/me/publish] Expert not found');
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<Expert>,
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { publish } = body;

    if (typeof publish !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'publish must be a boolean' } as ApiResponse<Expert>,
        { status: 400 }
      );
    }

    // Block publishing if flagged for review (pending or rejected)
    if (publish && expert.flaggedForReview && expert.reviewStatus !== 'approved') {
      console.log(
        '[DBG][expert/me/publish] Cannot publish - flagged for review:',
        expert.reviewStatus
      );
      return NextResponse.json(
        {
          success: false,
          error:
            expert.reviewStatus === 'rejected'
              ? 'Your expert ID was rejected during review. Please contact support.'
              : 'Your expert ID is pending review. You will be able to publish once the review is complete.',
        } as ApiResponse<Expert>,
        { status: 403 }
      );
    }

    let updatedExpert: Expert;

    if (publish) {
      // Publish: Copy draftLandingPage to customLandingPage and set isLandingPagePublished
      updatedExpert = await expertRepository.publishLandingPage(user.expertProfile);
      console.log(
        '[DBG][expert/me/publish] Published landing page (draft → published):',
        updatedExpert.id
      );
    } else {
      // Unpublish: Just set isLandingPagePublished to false
      updatedExpert = await expertRepository.updateExpert(user.expertProfile, {
        isLandingPagePublished: false,
      });
      console.log('[DBG][expert/me/publish] Unpublished landing page:', updatedExpert.id);
    }

    return NextResponse.json({
      success: true,
      data: updatedExpert,
      message: publish ? 'Landing page published successfully' : 'Landing page unpublished',
    } as ApiResponse<Expert>);
  } catch (error) {
    console.error('[DBG][expert/me/publish] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update publish status',
      } as ApiResponse<Expert>,
      { status: 500 }
    );
  }
}

/**
 * GET /data/app/expert/me/publish
 * Get current publish status
 */
export async function GET() {
  console.log('[DBG][expert/me/publish] GET called');

  try {
    const session = await getSessionFromCookies();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user || !user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    const expert = await expertRepository.getExpertById(user.expertProfile);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        isPublished: expert.isLandingPagePublished ?? false,
      },
    });
  } catch (error) {
    console.error('[DBG][expert/me/publish] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get publish status' },
      { status: 500 }
    );
  }
}
