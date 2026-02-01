import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createClient, type PhotosWithTotalResults, type Photo } from 'pexels';

/**
 * Pexels Image Search API
 * GET /api/pexels/search?query=yoga&page=1&per_page=12
 *
 * Proxies requests to Pexels API to keep API key secret.
 * Returns optimized image URLs for hero backgrounds.
 *
 * Required env var:
 * - PEXELS_API_KEY: Your Pexels API key
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

export interface PexelsImageResult {
  id: number;
  width: number;
  height: number;
  avgColor: string;
  description: string | null;
  urls: {
    thumb: string;
    preview: string;
    hero: string;
  };
  attribution: {
    photographerName: string;
    photographerUrl: string;
    pexelsUrl: string;
  };
}

export async function GET(request: NextRequest) {
  if (!PEXELS_API_KEY) {
    console.error('[DBG][pexels/search] PEXELS_API_KEY not configured');
    return NextResponse.json(
      { success: false, error: 'Pexels API not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = parseInt(searchParams.get('page') || '1');
  const perPage = parseInt(searchParams.get('per_page') || '12');

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const client = createClient(PEXELS_API_KEY);

    console.log('[DBG][pexels/search] Searching:', query, 'page:', page);

    const response = await client.photos.search({
      query,
      page,
      per_page: perPage,
      orientation: 'landscape',
    });

    // Type guard to check if response is PhotosWithTotalResults
    if ('error' in response) {
      console.error('[DBG][pexels/search] API error:', response);
      return NextResponse.json(
        { success: false, error: 'Failed to search Pexels' },
        { status: 500 }
      );
    }

    const data = response as PhotosWithTotalResults;
    const totalPages = Math.ceil(data.total_results / perPage);

    // Transform results to our format
    const results: PexelsImageResult[] = data.photos.map((photo: Photo) => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      avgColor: photo.avg_color || '#888888',
      description: photo.alt || null,
      urls: {
        // Tiny for grid preview
        thumb: photo.src.tiny,
        // Medium for larger preview
        preview: photo.src.medium,
        // Landscape for hero background (1200x627 optimized for hero)
        hero: photo.src.landscape,
      },
      attribution: {
        photographerName: photo.photographer,
        photographerUrl: photo.photographer_url,
        pexelsUrl: photo.url,
      },
    }));

    console.log('[DBG][pexels/search] Found', data.total_results, 'results');

    return NextResponse.json({
      success: true,
      data: {
        total: data.total_results,
        totalPages,
        page,
        results,
      },
    });
  } catch (error) {
    console.error('[DBG][pexels/search] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search images' }, { status: 500 });
  }
}
