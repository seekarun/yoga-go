import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getVideosByIds } from '@/lib/repositories/videoStatusRepository';

/**
 * POST /api/uploads/status
 *
 * Sync endpoint for client to check current status of videos by their Cloudflare IDs.
 * Used to update IndexedDB when uploads completed while browser was closed.
 */
export async function POST(request: NextRequest) {
  console.log('[DBG][uploads-status] Status check request received');

  try {
    const body = await request.json();
    const { videoIds } = body;

    if (!videoIds || !Array.isArray(videoIds)) {
      return NextResponse.json(
        { success: false, error: 'videoIds array is required' },
        { status: 400 }
      );
    }

    if (videoIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Limit to prevent abuse
    if (videoIds.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Maximum 50 video IDs allowed' },
        { status: 400 }
      );
    }

    console.log('[DBG][uploads-status] Checking status for', videoIds.length, 'videos');

    // Get statuses from database
    const statuses = await getVideosByIds(videoIds);

    console.log('[DBG][uploads-status] Found', statuses.length, 'matching videos');

    return NextResponse.json({
      success: true,
      data: statuses,
    });
  } catch (error) {
    console.error('[DBG][uploads-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
