/**
 * Public Blog Comments API Route
 * GET /data/experts/[expertId]/blog/[postId]/comments - List comments for a blog post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogComment } from '@/types';
import { getCommentsByPost } from '@/lib/repositories/blogCommentRepository';
import { getBlogPostById } from '@/lib/repositories/blogPostRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expertId: string; postId: string }> }
) {
  try {
    const { expertId, postId } = await params;
    console.log('[DBG][blog/comments/route] GET request for post:', postId);

    // Verify the post exists and is published
    const post = await getBlogPostById(postId);
    if (!post || post.expertId !== expertId || post.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const comments = await getCommentsByPost(postId);

    const response: ApiResponse<BlogComment[]> = {
      success: true,
      data: comments,
      total: comments.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][blog/comments/route] Error fetching comments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}
