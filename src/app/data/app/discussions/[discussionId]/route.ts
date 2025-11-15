import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscussionModel from '@/models/Discussion';
import CourseModel from '@/models/Course';
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
    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
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

    // Update discussion
    discussionDoc.content = content.trim();
    discussionDoc.editedAt = new Date().toISOString();
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
    if (!session || !session.user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not authenticated',
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Get user from MongoDB
    const user = await getUserByAuth0Id(session.user.sub);
    if (!user) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'User not found',
      };
      return NextResponse.json(response, { status: 404 });
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

    // Check if user owns this discussion OR if user is expert for this course
    let canDelete = discussionDoc.userId === user.id;

    // If not owner, check if user is expert for this course
    if (!canDelete && user.role === 'expert' && user.expertProfile) {
      const course = await CourseModel.findById(discussionDoc.courseId).exec();
      if (course && course.instructor.id === user.expertProfile) {
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

    // Soft delete
    discussionDoc.deletedAt = new Date().toISOString();
    await discussionDoc.save();

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
