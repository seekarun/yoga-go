/**
 * Forum API - Context-based thread operations (Slack-like)
 *
 * GET /data/forum/context/[...context] - Get threads for a specific context
 * POST /data/forum/context/[...context] - Create a new thread (auth required)
 *
 * Context format examples:
 * - /data/forum/context/blog/post/123
 * - /data/forum/context/course/abc/lesson/xyz
 * - /data/forum/context/community/expertId
 *
 * Query params (GET):
 * - expertId: Expert/tenant ID (required)
 * - contextVisibility: 'public' | 'private' (required)
 *
 * Body (POST):
 * - content: Thread content (required)
 * - contextVisibility: 'public' | 'private' (required)
 * - expertId: Expert/tenant ID (required)
 * - contextType: 'blog' | 'course' | 'webinar' | 'community' (required)
 * - sourceTitle: Title for aggregated views (optional)
 * - sourceUrl: URL for aggregated views (optional)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as forumRepository from '@/lib/repositories/forumRepository';
import {
  getSessionDual,
  getForumAccessLevelFromContext,
  getUserByCognitoSub,
  hasRole,
} from '@/lib/auth';
import type { ForumContextType, ForumContextVisibility, ForumThreadWithReplies } from '@/types';

interface RouteContext {
  params: Promise<{ context: string[] }>;
}

// Convert URL path segments to context string
function buildContextString(segments: string[]): string {
  return segments.join('.');
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { context: contextSegments } = await params;
  const context = buildContextString(contextSegments);
  console.log('[DBG][forum/context] GET - Fetching threads for context:', context);

  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');
    const contextVisibility = searchParams.get('contextVisibility') as ForumContextVisibility;

    if (!expertId || !contextVisibility) {
      return NextResponse.json(
        { success: false, error: 'expertId and contextVisibility are required' },
        { status: 400 }
      );
    }

    // Check access level
    const session = await getSessionDual(request);
    const visitorId = session?.user?.cognitoSub || null;

    const accessLevel = await getForumAccessLevelFromContext(
      context,
      contextVisibility,
      expertId,
      visitorId
    );

    if (accessLevel === 'none') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get threads with replies for context
    const threads = await forumRepository.getThreadsByContext(expertId, context);

    // Get user like status for all messages (threads and replies)
    let userLikes: Record<string, boolean> = {};
    if (visitorId) {
      const allMessageIds: string[] = [];
      for (const thread of threads) {
        allMessageIds.push(thread.id);
        for (const reply of thread.replies) {
          allMessageIds.push(reply.id);
        }
      }
      userLikes = await forumRepository.getUserLikesForMessages(
        expertId,
        context,
        allMessageIds,
        visitorId
      );
    }

    // Enrich threads and replies with user like status
    const enrichedThreads: ForumThreadWithReplies[] = threads.map(thread => ({
      ...thread,
      userLiked: userLikes[thread.id] || false,
      replies: thread.replies.map(reply => ({
        ...reply,
        userLiked: userLikes[reply.id] || false,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: enrichedThreads,
      accessLevel,
    });
  } catch (error) {
    console.error('[DBG][forum/context] Error fetching threads:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch threads',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { context: contextSegments } = await params;
  const context = buildContextString(contextSegments);
  console.log('[DBG][forum/context] POST - Creating thread for context:', context);

  try {
    // Require authentication
    const session = await getSessionDual(request);
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const visitorId = session.user.cognitoSub;
    const body = await request.json();

    const { content, contextVisibility, expertId, contextType, sourceTitle, sourceUrl } = body as {
      content: string;
      contextVisibility: ForumContextVisibility;
      expertId: string;
      contextType: ForumContextType;
      sourceTitle?: string;
      sourceUrl?: string;
    };

    // Validate required fields
    if (!content || !contextVisibility || !expertId || !contextType) {
      return NextResponse.json(
        {
          success: false,
          error: 'content, contextVisibility, expertId, and contextType are required',
        },
        { status: 400 }
      );
    }

    // Check access level
    const accessLevel = await getForumAccessLevelFromContext(
      context,
      contextVisibility,
      expertId,
      visitorId
    );

    if (accessLevel !== 'participate') {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to post in this context' },
        { status: 403 }
      );
    }

    // Get user details
    const user = await getUserByCognitoSub(visitorId);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Determine user role for display
    const userRole =
      hasRole(user, 'expert') && user.expertProfile === expertId ? 'expert' : 'learner';

    // Create thread
    const thread = await forumRepository.createThread({
      context,
      contextType,
      contextVisibility,
      expertId,
      userId: visitorId,
      userRole,
      userName: user.profile?.name || 'Anonymous',
      userAvatar: user.profile?.avatar,
      content,
      sourceTitle,
      sourceUrl,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...thread,
        replies: [],
        userLiked: false,
      },
    });
  } catch (error) {
    console.error('[DBG][forum/context] Error creating thread:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create thread',
      },
      { status: 500 }
    );
  }
}
