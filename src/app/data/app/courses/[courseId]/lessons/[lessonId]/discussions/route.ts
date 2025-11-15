import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscussionModel from '@/models/Discussion';
import DiscussionVoteModel from '@/models/DiscussionVote';
import type { ApiResponse, DiscussionThread, Discussion } from '@/types';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params;
  console.log(
    `[DBG][app/courses/[courseId]/lessons/[lessonId]/discussions/route.ts] GET discussions for lesson ${lessonId}`
  );

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

    // Check if user is enrolled in this course
    const enrolledCourse = user.enrolledCourses.find(ec => ec.courseId === courseId);
    if (!enrolledCourse) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not enrolled in this course',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Fetch all discussions for this lesson (not hidden, not deleted)
    const discussions = await DiscussionModel.find({
      lessonId,
      courseId,
      isHidden: false,
      deletedAt: { $exists: false },
    })
      .sort({ isPinned: -1, createdAt: -1 }) // Pinned first, then newest
      .lean()
      .exec();

    // Fetch user's votes for these discussions
    const discussionIds = discussions.map(d => d._id);
    const userVotes = await DiscussionVoteModel.find({
      discussionId: { $in: discussionIds },
      userId: user.id,
    })
      .lean()
      .exec();

    const userVoteMap = new Map(userVotes.map(v => [v.discussionId, v.voteType]));

    // Build threaded structure
    const discussionMap = new Map<string, DiscussionThread>();
    const topLevelDiscussions: DiscussionThread[] = [];

    // First pass: convert all discussions to DiscussionThread
    discussions.forEach((doc: any) => {
      const thread: DiscussionThread = {
        id: doc._id,
        courseId: doc.courseId,
        lessonId: doc.lessonId,
        userId: doc.userId,
        userRole: doc.userRole,
        userName: doc.userName,
        userAvatar: doc.userAvatar,
        content: doc.content,
        parentId: doc.parentId,
        upvotes: doc.upvotes,
        downvotes: doc.downvotes,
        isPinned: doc.isPinned,
        isResolved: doc.isResolved,
        isHidden: doc.isHidden,
        editedAt: doc.editedAt,
        deletedAt: doc.deletedAt,
        createdAt: doc.createdAt?.toISOString(),
        updatedAt: doc.updatedAt?.toISOString(),
        replies: [],
        userVote: userVoteMap.get(doc._id),
        netScore: doc.upvotes - doc.downvotes,
      };
      discussionMap.set(doc._id, thread);
    });

    // Second pass: build hierarchy
    discussionMap.forEach(thread => {
      if (thread.parentId) {
        const parent = discussionMap.get(thread.parentId);
        if (parent) {
          parent.replies.push(thread);
        }
      } else {
        topLevelDiscussions.push(thread);
      }
    });

    // Sort replies by score
    const sortReplies = (threads: DiscussionThread[]) => {
      threads.sort((a, b) => b.netScore - a.netScore);
      threads.forEach(thread => {
        if (thread.replies.length > 0) {
          sortReplies(thread.replies);
        }
      });
    };
    sortReplies(topLevelDiscussions);

    const response: ApiResponse<DiscussionThread[]> = {
      success: true,
      data: topLevelDiscussions,
      total: topLevelDiscussions.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      `[DBG][app/courses/[courseId]/lessons/[lessonId]/discussions/route.ts] Error:`,
      error
    );
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; lessonId: string }> }
) {
  const { courseId, lessonId } = await params;
  console.log(
    `[DBG][app/courses/[courseId]/lessons/[lessonId]/discussions/route.ts] POST new discussion`
  );

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

    // Check if user is enrolled in this course
    const enrolledCourse = user.enrolledCourses.find(ec => ec.courseId === courseId);
    if (!enrolledCourse) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not enrolled in this course',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse request body
    const body = await request.json();
    const { content, parentId } = body;

    if (!content || content.trim().length === 0) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Content is required',
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Connect to MongoDB
    await connectToDatabase();

    // Create discussion ID
    const discussionId = `${lessonId}_${user.id}_${Date.now()}`;

    // Create discussion document
    const discussionDoc = {
      _id: discussionId,
      courseId,
      lessonId,
      userId: user.id,
      userRole: user.role,
      userName: user.profile.name,
      userAvatar: user.profile.avatar,
      content: content.trim(),
      parentId: parentId || undefined,
      upvotes: 0,
      downvotes: 0,
      isPinned: false,
      isResolved: false,
      isHidden: false,
    };

    await DiscussionModel.create(discussionDoc);

    // Convert to Discussion type
    const discussion: Discussion = {
      id: discussionId,
      courseId,
      lessonId,
      userId: user.id,
      userRole: user.role,
      userName: user.profile.name,
      userAvatar: user.profile.avatar,
      content: content.trim(),
      parentId: parentId || undefined,
      upvotes: 0,
      downvotes: 0,
      isPinned: false,
      isResolved: false,
      isHidden: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const response: ApiResponse<Discussion> = {
      success: true,
      data: discussion,
      message: 'Discussion created successfully',
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(
      `[DBG][app/courses/[courseId]/lessons/[lessonId]/discussions/route.ts] Error:`,
      error
    );
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
