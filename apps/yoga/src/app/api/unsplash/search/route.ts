import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Unsplash Image Search API
 * GET /api/unsplash/search?query=yoga&page=1&per_page=12
 *
 * Proxies requests to Unsplash API to keep access key secret.
 * Returns optimized image URLs for hero backgrounds (1920px width).
 *
 * Required env var:
 * - UNSPLASH_ACCESS_KEY: The "Access Key" from your Unsplash app dashboard
 *   (found at https://unsplash.com/oauth/applications under your app)
 *   Note: You only need the Access Key, not the Secret Key
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string;
  blur_hash: string;
  description: string | null;
  alt_description: string | null;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  links: {
    self: string;
    html: string;
    download: string;
    download_location: string;
  };
  user: {
    id: string;
    username: string;
    name: string;
    portfolio_url: string | null;
    links: {
      self: string;
      html: string;
    };
  };
}

interface UnsplashSearchResponse {
  total: number;
  total_pages: number;
  results: UnsplashPhoto[];
}

export interface UnsplashImageResult {
  id: string;
  width: number;
  height: number;
  color: string;
  description: string | null;
  // Optimized URLs for different use cases
  urls: {
    thumb: string; // For grid preview (200px)
    preview: string; // For larger preview (400px)
    hero: string; // For hero background (1920px, optimized)
  };
  // Attribution data (required by Unsplash)
  attribution: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
  // For download tracking
  downloadLocation: string;
}

export async function GET(request: NextRequest) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('[DBG][unsplash/search] UNSPLASH_ACCESS_KEY not configured');
    return NextResponse.json(
      { success: false, error: 'Unsplash API not configured' },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '12';

  if (!query) {
    return NextResponse.json(
      { success: false, error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    // Search Unsplash API
    // Orientation: landscape is best for hero backgrounds
    const url = new URL(`${UNSPLASH_API_URL}/search/photos`);
    url.searchParams.set('query', query);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', perPage);
    url.searchParams.set('orientation', 'landscape');

    console.log('[DBG][unsplash/search] Searching:', query, 'page:', page);

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DBG][unsplash/search] API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to search Unsplash' },
        { status: response.status }
      );
    }

    const data: UnsplashSearchResponse = await response.json();

    // UTM parameters for attribution links
    const utmParams = '?utm_source=myyoga_guru&utm_medium=referral';

    // Transform results to our format with optimized URLs
    const results: UnsplashImageResult[] = data.results.map(photo => ({
      id: photo.id,
      width: photo.width,
      height: photo.height,
      color: photo.color,
      description: photo.alt_description || photo.description,
      urls: {
        // Thumbnail for grid (200px width, quality 80)
        thumb: `${photo.urls.raw}&w=200&h=133&fit=crop&q=80`,
        // Preview for selection modal (400px width)
        preview: `${photo.urls.raw}&w=400&h=267&fit=crop&q=80`,
        // Hero background (1920px width, optimized quality)
        hero: `${photo.urls.raw}&w=1920&h=600&fit=crop&q=85`,
      },
      attribution: {
        photographerName: photo.user.name,
        photographerUsername: photo.user.username,
        photographerUrl: `${photo.user.links.html}${utmParams}`,
        unsplashUrl: `https://unsplash.com${utmParams}`,
      },
      downloadLocation: photo.links.download_location,
    }));

    return NextResponse.json({
      success: true,
      data: {
        total: data.total,
        totalPages: data.total_pages,
        page: parseInt(page),
        results,
      },
    });
  } catch (error) {
    console.error('[DBG][unsplash/search] Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to search images' }, { status: 500 });
  }
}
