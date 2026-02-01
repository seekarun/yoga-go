import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireAdminAuth, getSessionFromCookies } from '@/lib/auth';
import * as expertRepository from '@/lib/repositories/expertRepository';
import type { ApiResponse, Expert } from '@/types';

/**
 * GET /data/admn/reviews
 * Get list of experts flagged for review
 * Query params: status (pending|approved|rejected|all)
 */
export async function GET(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    console.log('[DBG][admn/reviews] Fetching flagged experts');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';

    // Get all experts
    const allExperts = await expertRepository.getAllExperts();

    // Filter for flagged experts
    let flaggedExperts = allExperts.filter((expert: Expert) => expert.flaggedForReview === true);

    // Filter by review status
    if (status !== 'all') {
      flaggedExperts = flaggedExperts.filter(
        (expert: Expert) =>
          expert.reviewStatus === status || (!expert.reviewStatus && status === 'pending')
      );
    }

    // Sort by flaggedAt descending (newest first)
    flaggedExperts.sort((a: Expert, b: Expert) => {
      const dateA = a.flaggedAt ? new Date(a.flaggedAt).getTime() : 0;
      const dateB = b.flaggedAt ? new Date(b.flaggedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Map to response format
    const reviewItems = flaggedExperts.map((expert: Expert) => ({
      id: expert.id,
      name: expert.name,
      avatar: expert.avatar,
      flagReason: expert.flagReason,
      flaggedAt: expert.flaggedAt,
      reviewStatus: expert.reviewStatus || 'pending',
      reviewedAt: expert.reviewedAt,
      reviewedBy: expert.reviewedBy,
      primaryDomain: expert.primaryDomain,
      createdAt: expert.createdAt,
    }));

    console.log('[DBG][admn/reviews] Found', reviewItems.length, 'flagged experts');

    return NextResponse.json({
      success: true,
      data: reviewItems,
      total: reviewItems.length,
    });
  } catch (error) {
    console.error('[DBG][admn/reviews] Error:', error);

    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ success: false, error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

/**
 * POST /data/admn/reviews
 * Approve or reject a flagged expert
 * Body: { expertId: string, action: 'approve' | 'reject' }
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdminAuth();

    const session = await getSessionFromCookies();
    const adminUserId = session?.user?.cognitoSub || 'unknown';

    const body = await request.json();
    const { expertId, action } = body;

    if (!expertId || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'expertId and action (approve|reject) are required' },
        { status: 400 }
      );
    }

    console.log('[DBG][admn/reviews] Processing review:', { expertId, action, adminUserId });

    // Get expert
    const expert = await expertRepository.getExpertById(expertId);
    if (!expert) {
      return NextResponse.json({ success: false, error: 'Expert not found' }, { status: 404 });
    }

    if (!expert.flaggedForReview) {
      return NextResponse.json(
        { success: false, error: 'Expert is not flagged for review' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (action === 'approve') {
      // Approve: Clear flag, allow publishing
      const updatedExpert = await expertRepository.updateExpert(expertId, {
        flaggedForReview: false,
        reviewStatus: 'approved',
        reviewedAt: now,
        reviewedBy: adminUserId,
      });

      console.log('[DBG][admn/reviews] Expert approved:', expertId);

      return NextResponse.json({
        success: true,
        data: updatedExpert,
        message: 'Expert ID approved. They can now publish their landing page.',
      } as ApiResponse<Expert>);
    } else {
      // Reject: Keep flag, update status
      const updatedExpert = await expertRepository.updateExpert(expertId, {
        reviewStatus: 'rejected',
        reviewedAt: now,
        reviewedBy: adminUserId,
      });

      console.log('[DBG][admn/reviews] Expert rejected:', expertId);

      return NextResponse.json({
        success: true,
        data: updatedExpert,
        message: 'Expert ID rejected. They will not be able to publish.',
      } as ApiResponse<Expert>);
    }
  } catch (error) {
    console.error('[DBG][admn/reviews] Error:', error);

    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(
      { success: false, error: 'Failed to process review' },
      { status: 500 }
    );
  }
}
