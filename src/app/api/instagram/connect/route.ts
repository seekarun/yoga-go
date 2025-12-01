import { NextResponse } from 'next/server';
import { getOAuthUrl } from '@/lib/instagram';

/**
 * GET /api/instagram/connect
 *
 * Initiates the Instagram OAuth flow by redirecting to Facebook's OAuth dialog.
 * This is a standalone route that doesn't require user authentication.
 */
export async function GET() {
  try {
    // Build the callback URL
    const baseUrl = process.env.AUTH0_BASE_URL || 'http://localhost:3111';
    const redirectUri = `${baseUrl}/api/instagram/callback`;

    // Generate a simple state for CSRF protection
    // In production, you might want to store this in a session
    const state = Math.random().toString(36).substring(7);

    // Get the OAuth URL
    const authUrl = getOAuthUrl(redirectUri, state);

    console.log('[DBG][instagram/connect] Redirecting to OAuth:', authUrl);

    // Redirect to Facebook OAuth
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('[DBG][instagram/connect] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate OAuth',
      },
      { status: 500 }
    );
  }
}
