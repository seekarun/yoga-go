/**
 * Zoom OAuth Connect Route
 * GET /api/auth/zoom/connect - Initiate Zoom OAuth flow for expert
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getAuthorizationUrl, isZoomConnected } from '@/lib/zoom-auth';

export async function GET(request: Request) {
  console.log('[DBG][zoom-connect] Initiating Zoom OAuth flow');

  try {
    // Verify user is authenticated and is an expert
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user to find their expert profile ID
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    // Use the expert profile ID (subdomain) as the ID for Zoom auth
    const url = new URL(request.url);
    const expertId = url.searchParams.get('expertId') || user.expertProfile;

    // Check if already connected
    const connected = await isZoomConnected(expertId);
    if (connected) {
      console.log('[DBG][zoom-connect] Already connected');
      return NextResponse.json({
        success: false,
        error: 'Zoom account already connected',
      });
    }

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(expertId);

    console.log('[DBG][zoom-connect] Redirecting to Zoom OAuth');
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[DBG][zoom-connect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Zoom OAuth',
      },
      { status: 500 }
    );
  }
}
