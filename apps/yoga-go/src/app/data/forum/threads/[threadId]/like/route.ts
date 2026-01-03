/**
 * Forum API - Like operations (Slack-like)
 *
 * POST /data/forum/threads/[threadId]/like - Like a message
 * DELETE /data/forum/threads/[threadId]/like - Unlike a message
 *
 * Body: { expertId }
 * Note: context is retrieved from the message itself
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import * as forumRepository from '@/lib/repositories/forumRepository';
import { getSessionDual, getForumAccessLevelFromContext } from '@/lib/auth';

interface RouteContext {
  params: Promise<{ threadId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const { threadId: messageId } = await params;
  console.log('[DBG][forum/like] POST - Liking message:', messageId);

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

    // Check access level - must be able to participate
    const accessLevel = await getForumAccessLevelFromContext(
      context,
      'public', // Likes are allowed on public contexts
      expertId,
      visitorId
    );

    if (accessLevel !== 'participate') {
      return NextResponse.json(
        { success: false, error: 'You must be logged in to like' },
        { status: 403 }
      );
    }

    // Like the message
    const success = await forumRepository.likeMessage(expertId, context, messageId, visitorId);

    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Already liked or message not found' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message liked successfully',
    });
  } catch (error) {
    console.error('[DBG][forum/like] Error liking message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to like message',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { threadId: messageId } = await params;
  console.log('[DBG][forum/like] DELETE - Unliking message:', messageId);

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

    // Unlike the message
    const success = await forumRepository.unlikeMessage(expertId, context, messageId, visitorId);

    if (!success) {
      return NextResponse.json({ success: false, error: 'Like not found' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Message unliked successfully',
    });
  } catch (error) {
    console.error('[DBG][forum/like] Error unliking message:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to unlike message',
      },
      { status: 500 }
    );
  }
}
