/**
 * Expert Blog Management API Route
 * GET /data/app/expert/me/blog - List all expert's blog posts (drafts + published)
 * POST /data/app/expert/me/blog - Create a new blog post
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogPost } from '@/types';
import { requireExpertAuth } from '@/lib/auth';
import {
  getBlogPostsByExpert,
  createBlogPost,
  type CreateBlogPostInput,
} from '@/lib/repositories/blogPostRepository';

export async function GET() {
  try {
    console.log('[DBG][expert/me/blog] GET request');

    const { user } = await requireExpertAuth();

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // Get all posts including drafts for the expert
    const posts = await getBlogPostsByExpert(user.expertProfile, true);

    const response: ApiResponse<BlogPost[]> = {
      success: true,
      data: posts,
      total: posts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][expert/me/blog] Error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('[DBG][expert/me/blog] POST request');

    const { user } = await requireExpertAuth();

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    const input: CreateBlogPostInput = {
      expertId: user.expertProfile,
      title: body.title,
      content: body.content,
      coverImage: body.coverImage,
      status: body.status || 'draft',
      tags: body.tags,
      attachments: body.attachments,
      excerpt: body.excerpt,
    };

    const post = await createBlogPost(input);

    const response: ApiResponse<BlogPost> = {
      success: true,
      data: post,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[DBG][expert/me/blog] Error:', error);

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('Forbidden')) {
        return NextResponse.json({ success: false, error: error.message }, { status: 403 });
      }
    }

    return NextResponse.json(
      { success: false, error: 'Failed to create blog post' },
      { status: 500 }
    );
  }
}
