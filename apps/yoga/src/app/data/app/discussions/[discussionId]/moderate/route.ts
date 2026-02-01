import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as discussionRepository from '@/lib/repositories/discussionRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import type { ApiResponse, Discussion } from '@/types';

type ModerationAction = 'pin' | 'unpin' | 'resolve' | 'unresolve' | 'hide' | 'unhide';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params;
  console.log(
    `[DBG][app/discussions/[discussionId]/moderate/route.ts] POST moderate discussion ${discussionId}`
  );

  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from DynamoDB
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is an expert (role is now an array)
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert || !user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Only experts can moderate discussions',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { action } = body as { action: ModerationAction };

    const validActions: ModerationAction[] = [
      'pin',
      'unpin',
      'resolve',
      'unresolve',
      'hide',
      'unhide',
    ];
    if (!action || !validActions.includes(action)) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid action. Must be one of: pin, unpin, resolve, unresolve, hide, unhide',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Get discussion using GSI3 lookup (by discussionId only)
    const discussionDoc = await discussionRepository.getDiscussionByIdOnly(discussionId);
    if (!discussionDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Discussion not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify user is the course instructor (cross-tenant lookup)
    const course = await courseRepository.getCourseByIdOnly(discussionDoc.courseId);
    if (!course || course.instructor.id !== user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'You can only moderate discussions in your own courses',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Prepare updates based on action
    const updates: Partial<Pick<Discussion, 'isPinned' | 'isResolved' | 'isHidden'>> = {};
    switch (action) {
      case 'pin':
        updates.isPinned = true;
        break;
      case 'unpin':
        updates.isPinned = false;
        break;
      case 'resolve':
        updates.isResolved = true;
        break;
      case 'unresolve':
        updates.isResolved = false;
        break;
      case 'hide':
        updates.isHidden = true;
        break;
      case 'unhide':
        updates.isHidden = false;
        break;
    }

    // Update discussion using repository
    const updatedDiscussion = await discussionRepository.updateDiscussion(
      discussionDoc.courseId,
      discussionDoc.lessonId,
      discussionId,
      updates
    );

    if (!updatedDiscussion) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Failed to update discussion',
      };
      return NextResponse.json(response, { status: 500 });
    }

    const response: ApiResponse<Discussion> = {
      success: true,
      data: updatedDiscussion,
      message: `Discussion ${action} successfully`,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][app/discussions/[discussionId]/moderate/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
