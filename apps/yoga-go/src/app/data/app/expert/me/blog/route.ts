/**
 * Expert Post Management API Route
 * GET /data/app/expert/me/blog - List all expert's posts (drafts + published)
 * POST /data/app/expert/me/blog - Create a new post
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse, Post, PostMedia, PostStatus } from '@/types';
import { requireExpertAuthDual } from '@/lib/auth';
import { getPostsByExpert, createPost } from '@/lib/repositories/postRepository';

interface CreatePostBody {
  content: string;
  media?: PostMedia[];
  status?: PostStatus;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[DBG][expert/me/blog] GET request');

    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][expert/me/blog] Authenticated via', session.authType);

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    // Get all posts including drafts for the expert
    const posts = await getPostsByExpert(user.expertProfile, true);

    const response: ApiResponse<Post[]> = {
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

    return NextResponse.json({ success: false, error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[DBG][expert/me/blog] POST request');

    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][expert/me/blog] Authenticated via', session.authType);

    if (!user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 404 }
      );
    }

    const body: CreatePostBody = await request.json();

    // Validate content (required, max 500 chars)
    if (!body.content || body.content.trim().length === 0) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    if (body.content.length > 500) {
      return NextResponse.json(
        { success: false, error: 'Content must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Validate media (max 10 items)
    if (body.media && body.media.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 media items allowed' },
        { status: 400 }
      );
    }

    const post = await createPost({
      expertId: user.expertProfile,
      content: body.content.trim(),
      media: body.media,
      status: body.status || 'draft',
    });

    const response: ApiResponse<Post> = {
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

    return NextResponse.json({ success: false, error: 'Failed to create post' }, { status: 500 });
  }
}
