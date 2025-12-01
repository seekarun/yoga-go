import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import InstagramConnection from '@/models/InstagramConnection';
import { connectToDatabase } from '@/lib/mongodb';
import { postImageToInstagram } from '@/lib/instagram';

interface PublishRequest {
  imageUrl: string;
  caption: string;
}

/**
 * POST /api/instagram/publish
 *
 * Publishes a single image post to Instagram.
 *
 * Request body:
 * - imageUrl: string - Publicly accessible URL of the image (must be JPEG)
 * - caption: string - Caption for the post (including hashtags)
 */
export async function POST(request: NextRequest) {
  try {
    const body: PublishRequest = await request.json();
    const { imageUrl, caption } = body;

    // Validate input
    if (!imageUrl || !caption) {
      return NextResponse.json(
        {
          success: false,
          error: 'imageUrl and caption are required',
        },
        { status: 400 }
      );
    }

    // Validate image URL is accessible
    if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return NextResponse.json(
        {
          success: false,
          error: 'imageUrl must be a valid HTTP/HTTPS URL',
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Get the active Instagram connection
    const connection = await InstagramConnection.findOne({ isActive: true }).sort({
      connectedAt: -1,
    });

    if (!connection) {
      return NextResponse.json(
        {
          success: false,
          error: 'No Instagram account connected. Please connect your account first.',
        },
        { status: 400 }
      );
    }

    console.log('[DBG][instagram/publish] Publishing to @' + connection.instagramUsername);
    console.log('[DBG][instagram/publish] Image URL:', imageUrl);
    console.log('[DBG][instagram/publish] Caption length:', caption.length);

    // Post to Instagram
    const result = await postImageToInstagram(
      connection.instagramUserId,
      connection.accessToken,
      imageUrl,
      caption
    );

    console.log('[DBG][instagram/publish] Published successfully:', result);

    return NextResponse.json({
      success: true,
      data: {
        mediaId: result.id,
        permalink: result.permalink,
        instagramUsername: connection.instagramUsername,
      },
    });
  } catch (error) {
    console.error('[DBG][instagram/publish] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish post',
      },
      { status: 500 }
    );
  }
}
