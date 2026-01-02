/**
 * Public Single Post API Route
 * GET /data/experts/[expertId]/blog/[postId] - Get a single published post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, Post } from '@/types';
import { getPostById } from '@/lib/repositories/postRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expertId: string; postId: string }> }
) {
  try {
    const { expertId, postId } = await params;
    console.log('[DBG][blog/postId/route] GET request for post:', postId);

    const post = await getPostById(postId);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Verify the post belongs to this expert
    if (post.expertId !== expertId) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Only return published posts for public access
    if (post.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const response: ApiResponse<Post> = {
      success: true,
      data: post,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][blog/postId/route] Error fetching post:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 });
  }
}
