import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscussionModel from '@/models/Discussion';
import DiscussionVoteModel from '@/models/DiscussionVote';
import type { ApiResponse, DiscussionThread } from '@/types';

export async function GET(request: Request, { params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  console.log(`[DBG][app/courses/[courseId]/discussions/route.ts] GET course-wide discussions`);

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

    // Check if user is enrolled in this course
    const enrolledCourse = user.enrolledCourses.find(ec => ec.courseId === courseId);
    if (!enrolledCourse) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not enrolled in this course',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    // Connect to MongoDB
    await connectToDatabase();

    // Build query
    const query: any = {
      courseId,
      isHidden: false,
      deletedAt: { $exists: false },
    };

    if (lessonId) {
      query.lessonId = lessonId;
    }

    // Fetch discussions
    const discussions = await DiscussionModel.find(query)
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
    console.error(`[DBG][app/courses/[courseId]/discussions/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
