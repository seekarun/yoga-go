import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as discussionRepository from '@/lib/repositories/discussionRepository';
import * as discussionVoteRepository from '@/lib/repositories/discussionVoteRepository';
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

    // Check if user is enrolled in this course
    const enrolledCourse = user.enrolledCourses.find(ec => ec.courseId === courseId);
    if (!enrolledCourse) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not enrolled in this course',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Fetch all discussions for this lesson (using DynamoDB)
    const discussions = await discussionRepository.getDiscussionsByLesson(courseId, lessonId);

    // Also get replies for each discussion
    const allDiscussions = [...discussions];
    for (const discussion of discussions) {
      const replies = await discussionRepository.getReplies(discussion.id);
      allDiscussions.push(...replies);
    }

    // Filter out hidden and deleted discussions
    const visibleDiscussions = allDiscussions.filter(d => !d.isHidden && !d.deletedAt);

    // Fetch user's votes for these discussions
    const discussionIds = visibleDiscussions.map(d => d.id);
    const userVoteMap = await discussionVoteRepository.getUserVotesForDiscussions(
      user.id,
      discussionIds
    );

    // Build threaded structure
    const discussionMap = new Map<string, DiscussionThread>();
    const topLevelDiscussions: DiscussionThread[] = [];

    // First pass: convert all discussions to DiscussionThread
    visibleDiscussions.forEach((doc: Discussion) => {
      const thread: DiscussionThread = {
        ...doc,
        replies: [],
        userVote: userVoteMap.get(doc.id),
        netScore: doc.upvotes - doc.downvotes,
      };
      discussionMap.set(doc.id, thread);
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

    // Sort by pinned first, then by score
    const sortDiscussions = (threads: DiscussionThread[]) => {
      threads.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
        return b.netScore - a.netScore;
      });
      threads.forEach(thread => {
        if (thread.replies.length > 0) {
          sortDiscussions(thread.replies);
        }
      });
    };
    sortDiscussions(topLevelDiscussions);

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

    // Determine primary role for discussion (prefer 'expert' if available, otherwise first role)
    const userRoles = Array.isArray(user.role) ? user.role : [user.role];
    const primaryRole = userRoles.includes('expert') ? 'expert' : userRoles[0] || 'learner';

    // Create discussion using repository
    const discussion = await discussionRepository.createDiscussion({
      courseId,
      lessonId,
      userId: user.id,
      userRole: primaryRole as 'learner' | 'expert',
      userName: user.profile.name,
      userAvatar: user.profile.avatar,
      content: content.trim(),
      parentId: parentId || undefined,
      upvotes: 0,
      downvotes: 0,
      isPinned: false,
      isResolved: false,
      isHidden: false,
    });

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
