/**
 * Blog Comments API Route (Authenticated)
 * POST /data/app/blog/[postId]/comments - Add a comment to a blog post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogComment } from '@/types';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getBlogPostById } from '@/lib/repositories/blogPostRepository';
import { createBlogComment } from '@/lib/repositories/blogCommentRepository';

export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    console.log('[DBG][app/blog/postId/comments] POST request for post:', postId);

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

    const body = await request.json();

    // Validate required fields
    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    const comment = await createBlogComment({
      postId: postId,
      expertId: post.expertId,
      userId: user.id,
      userName: user.profile.name || 'Anonymous',
      userAvatar: user.profile.avatar,
      content: body.content.trim(),
    });

    const response: ApiResponse<BlogComment> = {
      success: true,
      data: comment,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[DBG][app/blog/postId/comments] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to add comment' }, { status: 500 });
  }
}
