/**
 * Public Single Blog Post API Route
 * GET /data/experts/[expertId]/blog/[postId] - Get a single published blog post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogPost } from '@/types';
import { getBlogPostById } from '@/lib/repositories/blogPostRepository';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ expertId: string; postId: string }> }
) {
  try {
    const { expertId, postId } = await params;
    console.log('[DBG][blog/postId/route] GET request for post:', postId);

    const post = await getBlogPostById(postId);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    // Verify the post belongs to this expert
    if (post.expertId !== expertId) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    // Only return published posts for public access
    if (post.status !== 'published') {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const response: ApiResponse<BlogPost> = {
      success: true,
      data: post,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][blog/postId/route] Error fetching blog post:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog post' },
      { status: 500 }
    );
  }
}
