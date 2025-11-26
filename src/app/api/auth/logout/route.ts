/**
 * GET /api/auth/logout
 *
 * Simple logout endpoint that clears the session cookie and redirects.
 * Navigate directly to this URL to log out.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[DBG][logout] ========== LOGOUT ==========');

  // Get redirect URL from query params, default to home
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo') || '/';

  // Determine the redirect URL
  const hostname = request.headers.get('host') || 'localhost:3111';
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${hostname}`;
  const redirectUrl = returnTo.startsWith('http')
    ? returnTo
    : new URL(returnTo, baseUrl).toString();

  console.log('[DBG][logout] Redirecting to:', redirectUrl);

  // Create redirect response
  const response = NextResponse.redirect(redirectUrl);

  // Clear the session cookie
  // IMPORTANT: Must match exactly how it was set in login
  const isProduction = process.env.NODE_ENV === 'production';

  // Set cookie to empty with immediate expiry
  response.cookies.set('authjs.session-token', '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    ...(isProduction && { domain: '.myyoga.guru' }),
  });

  console.log('[DBG][logout] Cookie cleared, isProduction:', isProduction);

  return response;
}
