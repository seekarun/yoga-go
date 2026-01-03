/**
 * Forum API - Single thread operations (Slack-like)
 *
 * GET /data/forum/threads/[threadId] - Get thread with replies
 *   Query params: expertId, context (both required)
 *
 * PUT /data/forum/threads/[threadId] - Edit message (owner only)
 *   Body: { content, expertId }
 *   Note: context is retrieved from the message itself
 *
 * DELETE /data/forum/threads/[threadId] - Delete message (owner or expert)
 *   Body: { expertId }
 *   Note: context is retrieved from the message itself
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
import type { ForumReplyWithLike } from '@/types';

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { threadId } = await params;
  console.log('[DBG][forum/threads] GET - Fetching thread:', threadId);

  try {
    const { searchParams } = new URL(request.url);
    const expertId = searchParams.get('expertId');
    const context = searchParams.get('context');

    if (!expertId || !context) {
      return NextResponse.json(
        { success: false, error: 'expertId and context are required' },
        { status: 400 }
      );
    }

    // Get thread with replies
    const threadWithReplies = await forumRepository.getThreadWithReplies(
      expertId,
      context,
      threadId
    );

    if (!threadWithReplies) {
      return NextResponse.json({ success: false, error: 'Thread not found' }, { status: 404 });
    }

    // Check access level
    const session = await getSessionDual(request);
    const visitorId = session?.user?.cognitoSub || null;

    const accessLevel = await getForumAccessLevelFromContext(
      context,
      threadWithReplies.contextVisibility,
      expertId,
      visitorId
    );

    if (accessLevel === 'none') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    // Get user like status for thread and all replies
    if (visitorId) {
      const allMessageIds = [threadWithReplies.id, ...threadWithReplies.replies.map(r => r.id)];
      const userLikes = await forumRepository.getUserLikesForMessages(
        expertId,
        context,
        allMessageIds,
        visitorId
      );

      threadWithReplies.userLiked = userLikes[threadWithReplies.id] || false;
      threadWithReplies.replies = threadWithReplies.replies.map(reply => ({
        ...reply,
        userLiked: userLikes[reply.id] || false,
      })) as ForumReplyWithLike[];
    }

    return NextResponse.json({
      success: true,
      data: threadWithReplies,
      accessLevel,
    });
  } catch (error) {
    console.error('[DBG][forum/threads] Error fetching thread:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch thread',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { threadId: messageId } = await params;
  console.log('[DBG][forum/threads] PUT - Editing message:', messageId);

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

    if (!content || !expertId) {
      return NextResponse.json(
        { success: false, error: 'content and expertId are required' },
        { status: 400 }
      );
    }

    // Find the message to get its context and verify it exists
    const message = await forumRepository.findMessageById(expertId, messageId);
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    const { context } = message;

    // Get full message details to verify ownership
    const fullMessage =
      message.entityType === 'FORUM_THREAD'
        ? await forumRepository.getThreadWithReplies(expertId, context, messageId)
        : null;

    // For now, we need to find the message owner
    // TODO: Add a function to get just the message owner without full thread lookup
    if (fullMessage && fullMessage.userId !== visitorId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own posts' },
        { status: 403 }
      );
    }

    // Update message
    const success = await forumRepository.updateMessage(expertId, context, messageId, content);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update message' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message updated successfully',
    });
  } catch (error) {
    console.error('[DBG][forum/threads] Error editing message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to edit message',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { threadId: messageId } = await params;
  console.log('[DBG][forum/threads] DELETE - Deleting message:', messageId);

  try {
    // Require authentication
    const session = await getSessionDual(request);
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const visitorId = session.user.cognitoSub;
    const body = await request.json();
    const { expertId } = body as { expertId: string };

    if (!expertId) {
      return NextResponse.json({ success: false, error: 'expertId is required' }, { status: 400 });
    }

    // Find the message to get its context
    const message = await forumRepository.findMessageById(expertId, messageId);
    if (!message) {
      return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
    }

    const { context } = message;

    // Get full message details to verify ownership
    const fullMessage =
      message.entityType === 'FORUM_THREAD'
        ? await forumRepository.getThreadWithReplies(expertId, context, messageId)
        : null;

    // Check if user is author or expert owner
    const user = await getUserByCognitoSub(visitorId);
    const isOwner = fullMessage && fullMessage.userId === visitorId;
    const isExpert = user && hasRole(user, 'expert') && user.expertProfile === expertId;

    if (!isOwner && !isExpert) {
      return NextResponse.json(
        { success: false, error: 'You do not have permission to delete this message' },
        { status: 403 }
      );
    }

    // Delete the message
    await forumRepository.deleteMessage(expertId, context, messageId);

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully',
    });
  } catch (error) {
    console.error('[DBG][forum/threads] Error deleting message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete message',
      },
      { status: 500 }
    );
  }
}
