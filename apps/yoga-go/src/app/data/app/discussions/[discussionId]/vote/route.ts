import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import * as discussionRepository from '@/lib/repositories/discussionRepository';
import * as discussionVoteRepository from '@/lib/repositories/discussionVoteRepository';
import type { ApiResponse, VoteType } from '@/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ discussionId: string }> }
) {
  const { discussionId } = await params;
  console.log(`[DBG][app/discussions/[discussionId]/vote/route.ts] POST vote on ${discussionId}`);

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

    // Parse request body
    const body = await request.json();
    const { voteType } = body as { voteType: VoteType };

    if (!voteType || (voteType !== 'up' && voteType !== 'down')) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Invalid vote type. Must be "up" or "down"',
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

    // Check if user is enrolled in this course
    const enrolledCourse = user.enrolledCourses.find(ec => ec.courseId === discussionDoc.courseId);
    if (!enrolledCourse) {
      const response: ApiResponse<null> = {
        success: false,
        error: 'Not enrolled in this course',
      };
      return NextResponse.json(response, { status: 403 });
    }

    // Check for existing vote
    const existingVote = await discussionVoteRepository.getVote(discussionId, user.id);

    let message = '';
    let upvoteDelta = 0;
    let downvoteDelta = 0;

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // User is clicking same vote again - remove vote (toggle off)
        if (voteType === 'up') {
          upvoteDelta = -1;
        } else {
          downvoteDelta = -1;
        }
        await discussionVoteRepository.deleteVote(discussionId, user.id);
        message = 'Vote removed';
      } else {
        // User is changing vote (up to down or down to up)
        if (existingVote.voteType === 'up') {
          upvoteDelta = -1;
          downvoteDelta = 1;
        } else {
          downvoteDelta = -1;
          upvoteDelta = 1;
        }
        await discussionVoteRepository.upsertVote(discussionId, user.id, voteType);
        message = 'Vote updated';
      }
    } else {
      // New vote
      await discussionVoteRepository.upsertVote(discussionId, user.id, voteType);
      if (voteType === 'up') {
        upvoteDelta = 1;
      } else {
        downvoteDelta = 1;
      }
      message = 'Vote recorded';
    }

    // Update vote counts on the discussion
    const updatedDiscussion = await discussionRepository.updateVoteCounts(
      discussionDoc.courseId,
      discussionDoc.lessonId,
      discussionId,
      upvoteDelta,
      downvoteDelta
    );

    const finalUpvotes =
      updatedDiscussion?.upvotes ?? Math.max(0, discussionDoc.upvotes + upvoteDelta);
    const finalDownvotes =
      updatedDiscussion?.downvotes ?? Math.max(0, discussionDoc.downvotes + downvoteDelta);

    const response: ApiResponse<{ upvotes: number; downvotes: number; netScore: number }> = {
      success: true,
      data: {
        upvotes: finalUpvotes,
        downvotes: finalDownvotes,
        netScore: finalUpvotes - finalDownvotes,
      },
      message,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(`[DBG][app/discussions/[discussionId]/vote/route.ts] Error:`, error);
    const response: ApiResponse<null> = {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    };
    return NextResponse.json(response, { status: 500 });
  }
}
