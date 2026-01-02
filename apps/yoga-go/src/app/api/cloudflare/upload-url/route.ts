import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/cloudflare/upload-url
 * Generates a direct upload URL for Cloudflare Stream
 */
export async function POST(request: NextRequest) {
  console.log('[DBG][cloudflare-upload-url] Generating upload URL');

  try {
    const body = await request.json();
    const { maxDurationSeconds = 3600 } = body; // Default 1 hour max duration

    const cfToken = process.env.CF_TOKEN;
    const cfAccountId = process.env.CF_ACCOUNT_ID;

    if (!cfToken) {
      console.error('[DBG][cloudflare-upload-url] Missing CF_TOKEN environment variable');
      return NextResponse.json(
        { success: false, error: 'Cloudflare token not configured' },
        { status: 500 }
      );
    }

    if (!cfAccountId) {
      console.error('[DBG][cloudflare-upload-url] Missing CF_ACCOUNT_ID environment variable');
      return NextResponse.json(
        { success: false, error: 'Cloudflare account ID not configured' },
        { status: 500 }
      );
    }

    // Call Cloudflare Stream API to get direct upload URL
    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds,
          requireSignedURLs: false, // Set to true if you want signed URLs
        }),
      }
    );

    const data = await cloudflareResponse.json();

    if (!cloudflareResponse.ok) {
      console.error('[DBG][cloudflare-upload-url] Cloudflare API error:', data);
      return NextResponse.json(
        {
          success: false,
          error: data.errors?.[0]?.message || 'Failed to generate upload URL',
        },
        { status: cloudflareResponse.status }
      );
    }

    const uid = data.result.uid;
    console.log('[DBG][cloudflare-upload-url] Upload URL generated:', uid);

    // Construct the video playback URL using CF subdomain
    const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'iq7mgkvtb3bwxqf5';
    const videoUrl = `https://customer-${cfSubdomain}.cloudflarestream.com/${uid}/iframe`;

    return NextResponse.json({
      success: true,
      data: {
        uploadURL: data.result.uploadURL,
        uid,
        videoUrl,
      },
    });
  } catch (error) {
    console.error('[DBG][cloudflare-upload-url] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
