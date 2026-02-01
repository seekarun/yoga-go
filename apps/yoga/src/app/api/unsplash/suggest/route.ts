import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Unsplash Image Suggestions API
 * POST /api/unsplash/suggest
 *
 * Extracts keywords from provided text (e.g., hero description) and
 * returns suggested Unsplash images for gallery auto-population.
 *
 * Required env var:
 * - UNSPLASH_ACCESS_KEY: The "Access Key" from your Unsplash app dashboard
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

interface UnsplashPhoto {
  id: string;
  width: number;
  height: number;
  color: string;
  alt_description: string | null;
  description: string | null;
  urls: {
    raw: string;
  };
  links: {
    download_location: string;
  };
  user: {
    name: string;
    username: string;
    links: {
      html: string;
    };
  };
}

interface UnsplashSearchResponse {
  total: number;
  results: UnsplashPhoto[];
}

export interface SuggestedGalleryImage {
  id: string;
  url: string;
  thumbUrl: string;
  caption: string;
  attribution: {
    photographerName: string;
    photographerUsername: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
  downloadLocation: string;
}

// Common words to filter out when extracting keywords
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'was',
  'are',
  'were',
  'been',
  'be',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'shall',
  'can',
  'need',
  'dare',
  'ought',
  'used',
  'your',
  'you',
  'our',
  'my',
  'their',
  'his',
  'her',
  'its',
  'this',
  'that',
  'these',
  'those',
  'i',
  'we',
  'they',
  'he',
  'she',
  'it',
  'who',
  'which',
  'what',
  'where',
  'when',
  'why',
  'how',
  'all',
  'each',
  'every',
  'both',
  'few',
  'more',
  'most',
  'other',
  'some',
  'such',
  'no',
  'nor',
  'not',
  'only',
  'own',
  'same',
  'so',
  'than',
  'too',
  'very',
  'just',
  'also',
  'into',
  'through',
  'during',
  'before',
  'after',
  'above',
  'below',
  'between',
  'under',
  'again',
  'further',
  'then',
  'once',
  'here',
  'there',
  'any',
  'about',
]);

/**
 * Extract meaningful keywords from text for image search
 */
function extractKeywords(text: string): string[] {
  // Remove special characters and split into words
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOP_WORDS.has(word));

  // Get unique words
  const uniqueWords = [...new Set(words)];

  // Prioritize yoga-related terms
  const yogaTerms = [
    'yoga',
    'meditation',
    'wellness',
    'mindfulness',
    'breath',
    'pose',
    'stretch',
    'relax',
    'calm',
    'peace',
    'health',
    'fitness',
    'balance',
    'strength',
    'flexibility',
    'healing',
    'therapy',
    'practice',
    'journey',
    'transform',
    'body',
    'mind',
    'spirit',
  ];

  const prioritized = uniqueWords.sort((a, b) => {
    const aIsYoga = yogaTerms.some(term => a.includes(term) || term.includes(a));
    const bIsYoga = yogaTerms.some(term => b.includes(term) || term.includes(b));
    if (aIsYoga && !bIsYoga) return -1;
    if (!aIsYoga && bIsYoga) return 1;
    return 0;
  });

  // Return top 3 keywords
  return prioritized.slice(0, 3);
}

export async function POST(request: NextRequest) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('[DBG][unsplash/suggest] UNSPLASH_ACCESS_KEY not configured');
    return NextResponse.json(
      { success: false, error: 'Unsplash API not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { text, count = 5 } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Text parameter is required' },
        { status: 400 }
      );
    }

    // Extract keywords from the text
    const keywords = extractKeywords(text);

    // Build search query - add "yoga" if not present
    let searchQuery = keywords.join(' ');
    if (!searchQuery.toLowerCase().includes('yoga')) {
      searchQuery = `yoga ${searchQuery}`;
    }

    console.log('[DBG][unsplash/suggest] Extracted keywords:', keywords);
    console.log('[DBG][unsplash/suggest] Search query:', searchQuery);

    // Search Unsplash
    const url = new URL(`${UNSPLASH_API_URL}/search/photos`);
    url.searchParams.set('query', searchQuery);
    url.searchParams.set('per_page', String(Math.min(count, 10)));
    url.searchParams.set('orientation', 'landscape');

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DBG][unsplash/suggest] API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch suggestions' },
        { status: response.status }
      );
    }

    const data: UnsplashSearchResponse = await response.json();
    const utmParams = '?utm_source=myyoga_guru&utm_medium=referral';

    // Transform to gallery image format
    const suggestions: SuggestedGalleryImage[] = data.results.map(photo => ({
      id: photo.id,
      url: `${photo.urls.raw}&w=800&h=600&fit=crop&q=80`,
      thumbUrl: `${photo.urls.raw}&w=200&h=150&fit=crop&q=80`,
      caption: photo.alt_description || photo.description || '',
      attribution: {
        photographerName: photo.user.name,
        photographerUsername: photo.user.username,
        photographerUrl: `${photo.user.links.html}${utmParams}`,
        unsplashUrl: `https://unsplash.com${utmParams}`,
      },
      downloadLocation: photo.links.download_location,
    }));

    console.log('[DBG][unsplash/suggest] Returning', suggestions.length, 'suggestions');

    return NextResponse.json({
      success: true,
      data: {
        keywords,
        searchQuery,
        suggestions,
      },
    });
  } catch (error) {
    console.error('[DBG][unsplash/suggest] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get suggestions' },
      { status: 500 }
    );
  }
}
