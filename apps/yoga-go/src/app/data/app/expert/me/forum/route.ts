/**
 * Expert Forum API - All threads for expert dashboard (Slack-like)
 *
 * GET /data/app/expert/me/forum - Get all threads with replies and unread status
 *
 * POST /data/app/expert/me/forum - Mark threads as read
 *   Body: { threadIds: string[] } or { threadId: string }
 *
 * Query params (GET):
 * - limit: Number of threads per page (default: 50)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as forumRepository from '@/lib/repositories/forumRepository';
import { requireExpertAuthDual } from '@/lib/auth';
import type { ForumThreadForDashboard } from '@/types';

export async function GET(request: NextRequest) {
  console.log('[DBG][expert/me/forum] GET - Fetching all threads for expert');

  try {
    // Require expert authentication (supports both cookies and Bearer token)
    const { user } = await requireExpertAuthDual(request);

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    const expertId = user.expertProfile;
    const visitorId = user.id;

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Get all threads with replies and unread status
    const { threads } = await forumRepository.getAllThreadsForExpert(expertId, { limit });

    // Get user like status for all messages (threads and replies)
    const contexts = [...new Set(threads.map(t => t.context))];
    const allLikes: Record<string, boolean> = {};

    for (const context of contexts) {
      const contextThreads = threads.filter(t => t.context === context);
      const allMessageIds: string[] = [];
      for (const thread of contextThreads) {
        allMessageIds.push(thread.id);
        for (const reply of thread.replies) {
          allMessageIds.push(reply.id);
        }
      }
      const likes = await forumRepository.getUserLikesForMessages(
        expertId,
        context,
        allMessageIds,
        visitorId
      );
      Object.assign(allLikes, likes);
    }

    // Enrich threads and replies with like status
    const enrichedThreads: ForumThreadForDashboard[] = threads.map(thread => ({
      ...thread,
      userLiked: allLikes[thread.id] || false,
      replies: thread.replies.map(reply => ({
        ...reply,
        userLiked: allLikes[reply.id] || false,
      })),
    }));

    // Summary stats
    const stats = {
      totalThreads: enrichedThreads.length,
      newThreads: enrichedThreads.filter(t => t.isNew).length,
      threadsWithNewReplies: enrichedThreads.filter(t => t.hasNewReplies && !t.isNew).length,
    };

    return NextResponse.json({
      success: true,
      data: enrichedThreads,
      stats,
    });
  } catch (error) {
    console.error('[DBG][expert/me/forum] Error fetching threads:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch threads',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[DBG][expert/me/forum] POST - Marking threads as read');

  try {
    // Require expert authentication
    const { user } = await requireExpertAuthDual(request);

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    const expertId = user.expertProfile;
    const body = await request.json();

    // Support both single threadId and array of threadIds
    const threadIds: string[] = body.threadIds || (body.threadId ? [body.threadId] : []);

    if (threadIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'threadId or threadIds is required' },
        { status: 400 }
      );
    }

    // Mark threads as read
    const count = await forumRepository.markThreadsAsRead(expertId, threadIds);

    return NextResponse.json({
      success: true,
      message: `Marked ${count} thread(s) as read`,
      markedCount: count,
    });
  } catch (error) {
    console.error('[DBG][expert/me/forum] Error marking threads as read:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to mark threads as read',
      },
      { status: 500 }
    );
  }
}
