/**
 * Zoom OAuth Callback Route
 * GET /api/auth/zoom/callback - Handle Zoom OAuth callback
 */

import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/zoom-auth';

export async function GET(request: Request) {
  console.log('[DBG][zoom-callback] Handling Zoom OAuth callback');

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains expertId
    const error = url.searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('[DBG][zoom-callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL('/srv?zoom_error=' + encodeURIComponent(error), request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[DBG][zoom-callback] Missing code or state');
      return NextResponse.redirect(new URL('/srv?zoom_error=missing_parameters', request.url));
    }

    const expertId = state;

    // Exchange code for tokens
    const auth = await exchangeCodeForTokens(code, expertId);

    console.log('[DBG][zoom-callback] Successfully connected Zoom account:', auth.email);

    // Redirect back to settings page with success
    return NextResponse.redirect(
      new URL(`/srv/${expertId}/settings/zoom?connected=true`, request.url)
    );
  } catch (error) {
    console.error('[DBG][zoom-callback] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to connect Zoom account';
    return NextResponse.redirect(
      new URL('/srv?zoom_error=' + encodeURIComponent(errorMessage), request.url)
    );
  }
}
