/**
 * Public Blog API Route
 * GET /data/experts/[expertId]/blog - List published blog posts for an expert
 */

import { NextResponse } from 'next/server';
import type { ApiResponse, BlogPost } from '@/types';
import { getBlogPostsByExpert } from '@/lib/repositories/blogPostRepository';

export async function GET(request: Request, { params }: { params: Promise<{ expertId: string }> }) {
  try {
    const { expertId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined;

    console.log('[DBG][blog/route] GET request for expert:', expertId, 'limit:', limit);

    // Get only published posts for public access
    let posts = await getBlogPostsByExpert(expertId, false);

    // Apply limit if specified
    if (limit && limit > 0) {
      posts = posts.slice(0, limit);
    }

    const response: ApiResponse<BlogPost[]> = {
      success: true,
      data: posts,
      total: posts.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][blog/route] Error fetching blog posts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blog posts' },
      { status: 500 }
    );
  }
}
