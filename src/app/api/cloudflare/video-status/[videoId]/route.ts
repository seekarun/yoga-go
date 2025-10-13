import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/cloudflare/video-status/[videoId]
 * Checks the status of a Cloudflare Stream video
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  console.log('[DBG][cloudflare-video-status] Checking status for video:', videoId);

  try {
    const cfToken = process.env.CF_TOKEN;
    const cfAccountId = process.env.CF_ACCOUNT_ID;

    if (!cfToken) {
      console.error('[DBG][cloudflare-video-status] Missing CF_TOKEN environment variable');
      return NextResponse.json(
        { success: false, error: 'Cloudflare token not configured' },
        { status: 500 }
      );
    }

    if (!cfAccountId) {
      console.error('[DBG][cloudflare-video-status] Missing CF_ACCOUNT_ID environment variable');
      return NextResponse.json(
        { success: false, error: 'Cloudflare account ID not configured' },
        { status: 500 }
      );
    }

    // Call Cloudflare Stream API to get video details
    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/${videoId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${cfToken}`,
        },
      }
    );

    const data = await cloudflareResponse.json();

    if (!cloudflareResponse.ok) {
      console.error('[DBG][cloudflare-video-status] Cloudflare API error:', data);
      return NextResponse.json(
        {
          success: false,
          error: data.errors?.[0]?.message || 'Failed to fetch video status',
        },
        { status: cloudflareResponse.status }
      );
    }

    const video = data.result;
    const status = video.status?.state || 'unknown';

    console.log('[DBG][cloudflare-video-status] Video status:', {
      uid: video.uid,
      status,
      duration: video.duration,
      ready: video.readyToStream,
    });

    return NextResponse.json({
      success: true,
      data: {
        uid: video.uid,
        status,
        readyToStream: video.readyToStream,
        duration: video.duration,
        thumbnail: video.thumbnail,
        preview: video.preview,
        playback: video.playback,
        meta: video.meta,
      },
    });
  } catch (error) {
    console.error('[DBG][cloudflare-video-status] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
