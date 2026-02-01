/**
 * Google Calendar OAuth Callback Route
 * GET /api/auth/google-calendar/callback - Handle Google OAuth callback
 */

import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google-auth';

export async function GET(request: Request) {
  console.log('[DBG][google-callback] Handling Google OAuth callback');

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state'); // Contains expertId
    const error = url.searchParams.get('error');

    // Check for OAuth errors
    if (error) {
      console.error('[DBG][google-callback] OAuth error:', error);
      return NextResponse.redirect(
        new URL('/srv?google_error=' + encodeURIComponent(error), request.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      console.error('[DBG][google-callback] Missing code or state');
      return NextResponse.redirect(new URL('/srv?google_error=missing_parameters', request.url));
    }

    const expertId = state;

    // Exchange code for tokens
    const auth = await exchangeCodeForTokens(code, expertId);

    console.log('[DBG][google-callback] Successfully connected Google account:', auth.email);

    // Redirect back to settings page with success
    return NextResponse.redirect(
      new URL(`/srv/${expertId}/settings/google?connected=true`, request.url)
    );
  } catch (error) {
    console.error('[DBG][google-callback] Error:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to connect Google account';
    return NextResponse.redirect(
      new URL('/srv?google_error=' + encodeURIComponent(errorMessage), request.url)
    );
  }
}
