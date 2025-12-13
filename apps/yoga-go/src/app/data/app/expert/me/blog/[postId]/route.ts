/**
 * Expert Single Blog Post Management API Route
 * GET /data/app/expert/me/blog/[postId] - Get a single blog post (any status)
 * PUT /data/app/expert/me/blog/[postId] - Update a blog post
 * DELETE /data/app/expert/me/blog/[postId] - Delete a blog post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogPost } from '@/types';
import { requireExpertAuth } from '@/lib/auth';
import {
  getBlogPostById,
  updateBlogPost,
  deleteBlogPost,
  type UpdateBlogPostInput,
} from '@/lib/repositories/blogPostRepository';

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

    const post = await getBlogPostById(postId);

    if (!post) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    // Verify the post belongs to this expert
    if (post.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const response: ApiResponse<BlogPost> = {
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

    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog post' },
      { status: 500 }
    );
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
    const existingPost = await getBlogPostById(postId);

    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    if (existingPost.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const body = await request.json();

    const updates: UpdateBlogPostInput = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.coverImage !== undefined) updates.coverImage = body.coverImage;
    if (body.status !== undefined) updates.status = body.status;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.attachments !== undefined) updates.attachments = body.attachments;
    if (body.excerpt !== undefined) updates.excerpt = body.excerpt;

    const post = await updateBlogPost(postId, updates);

    if (!post) {
      return NextResponse.json(
        { success: false, error: 'Failed to update blog post' },
        { status: 500 }
      );
    }

    const response: ApiResponse<BlogPost> = {
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

    return NextResponse.json(
      { success: false, error: 'Failed to update blog post' },
      { status: 500 }
    );
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
    const existingPost = await getBlogPostById(postId);

    if (!existingPost) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    if (existingPost.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Blog post not found' }, { status: 404 });
    }

    const deleted = await deleteBlogPost(postId);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete blog post' },
        { status: 500 }
      );
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

    return NextResponse.json(
      { success: false, error: 'Failed to delete blog post' },
      { status: 500 }
    );
  }
}
