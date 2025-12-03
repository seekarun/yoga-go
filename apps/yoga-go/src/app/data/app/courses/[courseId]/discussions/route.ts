import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as discussionRepository from '@/lib/repositories/discussionRepository';
import * as discussionVoteRepository from '@/lib/repositories/discussionVoteRepository';
import type { ApiResponse, DiscussionThread, Discussion } from '@/types';

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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');

    // Fetch discussions using DynamoDB
    let discussions: Discussion[];
    if (lessonId) {
      discussions = await discussionRepository.getDiscussionsByLesson(courseId, lessonId);
      // Also get replies
      const allDiscussions = [...discussions];
      for (const discussion of discussions) {
        const replies = await discussionRepository.getReplies(discussion.id);
        allDiscussions.push(...replies);
      }
      discussions = allDiscussions;
    } else {
      discussions = await discussionRepository.getDiscussionsByCourse(courseId);
    }

    // Filter out hidden and deleted discussions
    const visibleDiscussions = discussions.filter(d => !d.isHidden && !d.deletedAt);

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
    console.error(`[DBG][app/courses/[courseId]/discussions/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
