import { NextResponse } from 'next/server';
import { getSession, getUserByAuth0Id } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import DiscussionModel from '@/models/Discussion';
import DiscussionVoteModel from '@/models/DiscussionVote';
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
    const existingVote = await DiscussionVoteModel.findOne({
      discussionId,
      userId: user.id,
    }).exec();

    let message = '';

    if (existingVote) {
      if (existingVote.voteType === voteType) {
        // User is clicking same vote again - remove vote (toggle off)
        // Decrement the vote count
        if (voteType === 'up') {
          discussionDoc.upvotes = Math.max(0, discussionDoc.upvotes - 1);
        } else {
          discussionDoc.downvotes = Math.max(0, discussionDoc.downvotes - 1);
        }
        await discussionDoc.save();
        await existingVote.deleteOne();
        message = 'Vote removed';
      } else {
        // User is changing vote (up to down or down to up)
        const oldVoteType = existingVote.voteType;

        // Update vote counts
        if (oldVoteType === 'up') {
          discussionDoc.upvotes = Math.max(0, discussionDoc.upvotes - 1);
          discussionDoc.downvotes += 1;
        } else {
          discussionDoc.downvotes = Math.max(0, discussionDoc.downvotes - 1);
          discussionDoc.upvotes += 1;
        }

        // Update vote document
        existingVote.voteType = voteType;
        await existingVote.save();
        await discussionDoc.save();
        message = 'Vote updated';
      }
    } else {
      // New vote
      const voteId = `${discussionId}_${user.id}`;
      await DiscussionVoteModel.create({
        _id: voteId,
        discussionId,
        userId: user.id,
        voteType,
      });

      // Increment vote count
      if (voteType === 'up') {
        discussionDoc.upvotes += 1;
      } else {
        discussionDoc.downvotes += 1;
      }
      await discussionDoc.save();
      message = 'Vote recorded';
    }

    const response: ApiResponse<{ upvotes: number; downvotes: number; netScore: number }> = {
      success: true,
      data: {
        upvotes: discussionDoc.upvotes,
        downvotes: discussionDoc.downvotes,
        netScore: discussionDoc.upvotes - discussionDoc.downvotes,
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
