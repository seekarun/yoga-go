/**
 * Expert Single Blog Post Management API Route
 * GET /data/app/expert/me/blog/[postId] - Get a single blog post (any status)
 * PUT /data/app/expert/me/blog/[postId] - Update a blog post (auto-regenerates excerpt and tags via AI)
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

/**
 * Call OpenAI to extract excerpt and tags from blog content
 */
async function extractBlogMetadata(
  title: string,
  content: string
): Promise<{ excerpt: string; tags: string[] }> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3111';
    const response = await fetch(`${baseUrl}/api/ai/extract-blog-metadata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content }),
    });

    const result = await response.json();
    if (result.success && result.data) {
      return result.data;
    }
  } catch (error) {
    console.error('[DBG][expert/me/blog/postId] Failed to extract metadata via AI:', error);
  }

  // Fallback: Create basic excerpt from content
  const plainText = content
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return {
    excerpt: plainText.substring(0, 160) + (plainText.length > 160 ? '...' : ''),
    tags: [],
  };
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
    if (body.attachments !== undefined) updates.attachments = body.attachments;

    // Regenerate excerpt and tags if title or content changed
    const titleChanged = body.title !== undefined && body.title !== existingPost.title;
    const contentChanged = body.content !== undefined && body.content !== existingPost.content;

    if (titleChanged || contentChanged) {
      console.log('[DBG][expert/me/blog/postId] Content changed, regenerating metadata via AI...');
      const newTitle = body.title ?? existingPost.title;
      const newContent = body.content ?? existingPost.content;
      const metadata = await extractBlogMetadata(newTitle, newContent);
      updates.excerpt = metadata.excerpt;
      updates.tags = metadata.tags;
      console.log('[DBG][expert/me/blog/postId] AI metadata:', metadata);
    }

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
