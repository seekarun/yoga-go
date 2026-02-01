import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Unsplash Download Tracking API
 * POST /api/unsplash/download
 *
 * Per Unsplash API guidelines, we must trigger a download request
 * when a user downloads/selects an image for use.
 * This ensures photographers get credit for their work.
 *
 * @see https://help.unsplash.com/api-guidelines/guideline-triggering-a-download
 */

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

export async function POST(request: NextRequest) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('[DBG][unsplash/download] UNSPLASH_ACCESS_KEY not configured');
    return NextResponse.json(
      { success: false, error: 'Unsplash API not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { downloadLocation } = body;

    if (!downloadLocation) {
      return NextResponse.json(
        { success: false, error: 'downloadLocation is required' },
        { status: 400 }
      );
    }

    // Validate the URL is from Unsplash
    if (!downloadLocation.startsWith('https://api.unsplash.com/')) {
      return NextResponse.json(
        { success: false, error: 'Invalid download location' },
        { status: 400 }
      );
    }

    console.log('[DBG][unsplash/download] Tracking download:', downloadLocation);

    // Trigger the download tracking request to Unsplash
    const response = await fetch(downloadLocation, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        'Accept-Version': 'v1',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DBG][unsplash/download] Tracking failed:', response.status, errorText);
      // Don't fail the user's action, just log the error
      // The image selection should still succeed
      return NextResponse.json({
        success: true,
        tracked: false,
        message: 'Download tracking failed but image can still be used',
      });
    }

    console.log('[DBG][unsplash/download] Download tracked successfully');

    return NextResponse.json({
      success: true,
      tracked: true,
    });
  } catch (error) {
    console.error('[DBG][unsplash/download] Error:', error);
    // Don't fail the user's action
    return NextResponse.json({
      success: true,
      tracked: false,
      message: 'Download tracking failed but image can still be used',
    });
  }
}
