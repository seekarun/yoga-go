/**
 * Expert Single Post Management API Route
 * GET /data/app/expert/me/blog/[postId] - Get a single post (any status)
 * PUT /data/app/expert/me/blog/[postId] - Update a post
 * DELETE /data/app/expert/me/blog/[postId] - Delete a post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, Post, PostMedia, PostStatus } from '@/types';
import { requireExpertAuth } from '@/lib/auth';
import { getPostById, updatePost, deletePost } from '@/lib/repositories/postRepository';

interface UpdatePostBody {
  content?: string;
  media?: PostMedia[];
  status?: PostStatus;
}

export async function GET(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    console.log('[DBG][expert/me/blog/postId] GET request for post:', postId);

    const { user } = await requireExpertAuth();

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    const post = await getPostById(postId);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    // Verify the post belongs to this expert
    if (post.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const response: ApiResponse<Post> = {
      success: true,
      data: post,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][expert/me/blog/postId] Error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to fetch post' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params;
    console.log('[DBG][expert/me/blog/postId] PUT request for post:', postId);

    const { user } = await requireExpertAuth();

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // Verify ownership first
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const body: UpdatePostBody = await request.json();

    // Validate content if provided
    if (body.content !== undefined && body.content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Content must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validate media if provided
    if (body.media && body.media.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 media items allowed' },
        { status: 400 }
      );
    }

    const post = await updatePost(postId, {
      content: body.content?.trim(),
      media: body.media,
      status: body.status,
    });

    if (!post) {
      return NextResponse.json({ success: false, error: 'Failed to update post' }, { status: 500 });
    }

    const response: ApiResponse<Post> = {
      success: true,
      data: post,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][expert/me/blog/postId] Error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to update post' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;
    console.log('[DBG][expert/me/blog/postId] DELETE request for post:', postId);

    const { user } = await requireExpertAuth();

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // Verify ownership first
    const existingPost = await getPostById(postId);

    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    if (existingPost.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Post not found' }, { status: 404 });
    }

    const deleted = await deletePost(postId);

    if (!deleted) {
      return NextResponse.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DBG][expert/me/blog/postId] Error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json({ success: false, error: 'Failed to delete post' }, { status: 500 });
  }
}
