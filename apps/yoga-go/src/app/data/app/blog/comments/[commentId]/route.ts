/**
 * Single Blog Comment API Route (Authenticated)
 * PUT /data/app/blog/comments/[commentId] - Edit own comment
 * DELETE /data/app/blog/comments/[commentId] - Delete own comment (or expert can delete)
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogComment } from '@/types';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getBlogPostById } from '@/lib/repositories/blogPostRepository';
import {
  getCommentById,
  updateBlogComment,
  deleteBlogComment,
} from '@/lib/repositories/blogCommentRepository';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    console.log('[DBG][app/blog/comments/commentId] PUT request for comment:', commentId);

    // Require authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Require postId to be provided
    if (!body.postId) {
      return NextResponse.json({ success: false, error: 'postId is required' }, { status: 400 });
    }

    // Validate content
    if (!body.content || typeof body.content !== 'string' || body.content.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Comment content is required' },
        { status: 400 }
      );
    }

    // Get the comment
    const comment = await getCommentById(body.postId, commentId);
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    // Only the comment author can edit
    if (comment.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own comments' },
        { status: 403 }
      );
    }

    const updatedComment = await updateBlogComment(body.postId, commentId, body.content.trim());

    if (!updatedComment) {
      return NextResponse.json(
        { success: false, error: 'Failed to update comment' },
        { status: 500 }
      );
    }

    const response: ApiResponse<BlogComment> = {
      success: true,
      data: updatedComment,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][app/blog/comments/commentId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await params;
    console.log('[DBG][app/blog/comments/commentId] DELETE request for comment:', commentId);

    // Require authentication
    const session = await getSession();
    if (!session || !session.user || !session.user.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Get postId from query params or body
    const url = new URL(request.url);
    const postId = url.searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        { success: false, error: 'postId query parameter is required' },
        { status: 400 }
      );
    }

    // Get the comment
    const comment = await getCommentById(postId, commentId);
    if (!comment) {
      return NextResponse.json({ success: false, error: 'Comment not found' }, { status: 404 });
    }

    // Get the post to check if user is the expert
    const post = await getBlogPostById(postId);

    // Allow deletion if user is comment author OR expert who owns the post
    const isCommentAuthor = comment.userId === user.id;
    const isPostExpert = post && user.expertProfile === post.expertId;

    if (!isCommentAuthor && !isPostExpert) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own comments' },
        { status: 403 }
      );
    }

    const deleted = await deleteBlogComment(postId, commentId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete comment' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DBG][app/blog/comments/commentId] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
