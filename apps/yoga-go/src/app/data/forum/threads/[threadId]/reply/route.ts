/**
 * Forum API - Reply operations (Slack-like, flat replies only)
 *
 * POST /data/forum/threads/[threadId]/reply - Create a reply to a thread
 *
 * Body: { content, expertId }
 * Note: context info is retrieved from the thread itself
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

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { threadId } = await params;
  console.log('[DBG][forum/reply] POST - Creating reply for thread:', threadId);

  try {
    // Require authentication
    const session = await getSessionDual(request);
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const visitorId = session.user.cognitoSub;
    const body = await request.json();

    const { content, expertId } = body as {
      content: string;
      expertId: string;
    };

    // Validate required fields
    if (!content || !expertId) {
      return NextResponse.json(
        { success: false, error: 'content and expertId are required' },
        { status: 400 }
      );
    }

    // First, find the thread to get context info
    const thread = await forumRepository.findThreadById(expertId, threadId);
    if (!thread) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 });
    }

    const { context, contextType, contextVisibility } = thread;

    // Check access level
    const accessLevel = await getForumAccessLevelFromContext(
      context,
      contextVisibility,
      expertId,
      visitorId
    );

    if (accessLevel !== 'participate') {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to reply in this context' },
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

    // Create reply
    const reply = await forumRepository.createReply({
      threadId,
      context,
      contextType,
      contextVisibility,
      expertId,
      userId: visitorId,
      userRole,
      userName: user.profile?.name || 'Anonymous',
      userAvatar: user.profile?.avatar,
      content,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...reply,
        userLiked: false,
      },
    });
  } catch (error) {
    console.error('[DBG][forum/reply] Error creating reply:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create reply',
      },
      { status: 500 }
    );
  }
}
