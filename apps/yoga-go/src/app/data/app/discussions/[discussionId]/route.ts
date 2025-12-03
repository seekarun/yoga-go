import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as discussionRepository from '@/lib/repositories/discussionRepository';
import * as courseRepository from '@/lib/repositories/courseRepository';
import type { ApiResponse, Discussion } from '@/types';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params;
  console.log(`[DBG][app/discussions/[discussionId]/route.ts] PUT edit discussion ${discussionId}`);

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

    // Get discussion using GSI3 lookup (by discussionId only)
    const discussionDoc = await discussionRepository.getDiscussionByIdOnly(discussionId);
    if (!discussionDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Discussion not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user owns this discussion
    if (discussionDoc.userId !== user.id) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'You can only edit your own discussions',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { content } = body;

    if (!content || content.trim().length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Content is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Update discussion using repository
    const updatedDiscussion = await discussionRepository.updateDiscussion(
      discussionDoc.courseId,
      discussionDoc.lessonId,
      discussionId,
      { content: content.trim() }
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
      message: 'Discussion updated successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][app/discussions/[discussionId]/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params;
  console.log(`[DBG][app/discussions/[discussionId]/route.ts] DELETE discussion ${discussionId}`);

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

    // Get discussion using GSI3 lookup (by discussionId only)
    const discussionDoc = await discussionRepository.getDiscussionByIdOnly(discussionId);
    if (!discussionDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Discussion not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user owns this discussion OR if user is expert for this course
    let canDelete = discussionDoc.userId === user.id;

    // If not owner, check if user is expert for this course (role is now an array)
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!canDelete && isExpert && user.expertProfile) {
      const course = await courseRepository.getCourseById(discussionDoc.courseId);
      if (course && course.instructor?.id === user.expertProfile) {
        canDelete = true;
      }
    }

    if (!canDelete) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'You do not have permission to delete this discussion',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Soft delete using repository
    await discussionRepository.softDeleteDiscussion(
      discussionDoc.courseId,
      discussionDoc.lessonId,
      discussionId
    );

    const response: ApiResponse<null> = {
      success: true,
      message: 'Discussion deleted successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][app/discussions/[discussionId]/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
