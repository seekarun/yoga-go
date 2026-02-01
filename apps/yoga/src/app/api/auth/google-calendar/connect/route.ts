/**
 * Google Calendar OAuth Connect Route
 * GET /api/auth/google-calendar/connect - Initiate Google OAuth flow for expert
 */

import { NextResponse } from 'next/server';
import { getSession, getUserByCognitoSub } from '@/lib/auth';
import { getAuthorizationUrl, isGoogleConnected } from '@/lib/google-auth';

export async function GET(request: Request) {
  console.log('[DBG][google-connect] Initiating Google OAuth flow');

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

    // Use the expert profile ID (subdomain) as the ID for Google auth
    const url = new URL(request.url);
    const expertId = url.searchParams.get('expertId') || user.expertProfile;

    // Check if already connected
    const connected = await isGoogleConnected(expertId);
    if (connected) {
      console.log('[DBG][google-connect] Already connected');
      return NextResponse.json({
        success: false,
        error: 'Google account already connected',
      });
    }

    // Generate authorization URL with login hint (pre-selects user's account)
    const loginHint = user.profile?.email || session.user.email;
    const authUrl = getAuthorizationUrl(expertId, loginHint);

    console.log('[DBG][google-connect] Redirecting to Google OAuth with hint:', loginHint);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[DBG][google-connect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate Google OAuth',
      },
      { status: 500 }
    );
  }
}
