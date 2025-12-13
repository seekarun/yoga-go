/**
 * Blog Like API Route (Authenticated)
 * GET /data/app/blog/[postId]/like - Get user's like status for a post
 * POST /data/app/blog/[postId]/like - Toggle like on a blog post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getBlogPostById } from '@/lib/repositories/blogPostRepository';
import { getLikeStatus, toggleLike } from '@/lib/repositories/blogLikeRepository';

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    console.log('[DBG][app/blog/postId/like] GET request for post:', postId);

    // Require authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Verify the post exists
    const post = await getBlogPostById(postId);
    if (!post || post.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const liked = await getLikeStatus(postId, user.id);

    const response: ApiResponse<{ liked: boolean; likeCount: number }> = {
      success: true,
      data: {
        liked,
        likeCount: post.likeCount,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/blog/postId/like] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get like status' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    console.log('[DBG][app/blog/postId/like] POST request for post:', postId);

    // Require authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Verify the post exists and is published
    const post = await getBlogPostById(postId);
    if (!post || post.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const result = await toggleLike(postId, user.id);

    // Get updated like count
    const updatedPost = await getBlogPostById(postId);

    const response: ApiResponse<{ liked: boolean; likeCount: number }> = {
      success: true,
      data: {
        liked: result.liked,
        likeCount: updatedPost?.likeCount || post.likeCount + (result.liked ? 1 : -1),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/blog/postId/like] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to toggle like' }, { status: 500 });
  }
}
