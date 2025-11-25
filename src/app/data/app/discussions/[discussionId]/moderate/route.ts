import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscussionModel from '@/models/Discussion';
import CourseModel from '@/models/Course';
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

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.cognitoSub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Check if user is an expert
    if (user.role !== 'expert' || !user.expertProfile) {
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

    // Connect to MongoDB
    await connectToDatabase();

    // Get discussion
    const discussionDoc = await DiscussionModel.findById(discussionId).exec();
    if (!discussionDoc) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Discussion not found',
      };
      return NextResponse.json(response, { status: 404 });
    }

    // Verify user is the course instructor
    const course = await CourseModel.findById(discussionDoc.courseId).exec();
    if (!course || course.instructor.id !== user.expertProfile) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'You can only moderate discussions in your own courses',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Apply moderation action
    switch (action) {
      case 'pin':
        discussionDoc.isPinned = true;
        break;
      case 'unpin':
        discussionDoc.isPinned = false;
        break;
      case 'resolve':
        discussionDoc.isResolved = true;
        break;
      case 'unresolve':
        discussionDoc.isResolved = false;
        break;
      case 'hide':
        discussionDoc.isHidden = true;
        break;
      case 'unhide':
        discussionDoc.isHidden = false;
        break;
    }

    await discussionDoc.save();

    // Convert to Discussion type
    const discussion: Discussion = {
      id: discussionDoc._id,
      courseId: discussionDoc.courseId,
      lessonId: discussionDoc.lessonId,
      userId: discussionDoc.userId,
      userRole: discussionDoc.userRole,
      userName: discussionDoc.userName,
      userAvatar: discussionDoc.userAvatar,
      content: discussionDoc.content,
      parentId: discussionDoc.parentId,
      upvotes: discussionDoc.upvotes,
      downvotes: discussionDoc.downvotes,
      isPinned: discussionDoc.isPinned,
      isResolved: discussionDoc.isResolved,
      isHidden: discussionDoc.isHidden,
      editedAt: discussionDoc.editedAt,
      deletedAt: discussionDoc.deletedAt,
      createdAt: discussionDoc.createdAt?.toISOString(),
      updatedAt: discussionDoc.updatedAt?.toISOString(),
    };

    const response: ApiResponse<Discussion> = {
      success: true,
      data: discussion,
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
