/**
 * Custom Logout Handler
 *
 * Clears session cookies and returns success.
 * Since we use custom auth forms (not Cognito hosted UI), we skip Cognito's
 * hosted logout to avoid showing their ugly confirmation page.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Helper to clear all auth cookies on a response
function clearAuthCookies(response: NextResponse) {
  const expiredDate = new Date(0); // Jan 1, 1970

  // Clear the main session cookie
  response.cookies.set('authjs.session-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiredDate,
    maxAge: 0,
  });

  // Clear other auth-related cookies
  const otherCookies = ['authjs.csrf-token', 'authjs.callback-url', 'pending_logout'];
  for (const cookieName of otherCookies) {
    response.cookies.set(cookieName, '', {
      path: '/',
      expires: expiredDate,
      maxAge: 0,
    });
  }
}

// POST handler - called from client-side fetch
export async function POST(request: NextRequest) {
  console.log('[DBG][do-logout] ========== LOGOUT POST HANDLER ==========');

  try {
    // Log all cookies present in the request
    const cookies = request.cookies.getAll();
    console.log('[DBG][do-logout] Cookies in request:', cookies.map(c => c.name).join(', '));

    // Create JSON response with Set-Cookie headers to clear cookies
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

    clearAuthCookies(response);

    console.log('[DBG][do-logout] Set-Cookie headers:', response.headers.get('Set-Cookie'));
    console.log('[DBG][do-logout] Cleared session cookies');

    return response;
  } catch (error) {
    console.error('[DBG][do-logout] Error:', error);
    return NextResponse.json({ success: false, message: 'Logout failed' }, { status: 500 });
  }
}

// GET handler - for direct navigation (backwards compatibility)
export async function GET(request: NextRequest) {
  console.log('[DBG][do-logout] ========== LOGOUT GET HANDLER ==========');

  try {
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    // Get returnTo from query params
    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('returnTo') || '/';

    console.log('[DBG][do-logout] returnTo:', returnTo);

    // Log all cookies present in the request
    const cookies = request.cookies.getAll();
    console.log('[DBG][do-logout] Cookies in request:', cookies.map(c => c.name).join(', '));

    // Build redirect URL
    const redirectUrl = returnTo.startsWith('http')
      ? returnTo
      : new URL(returnTo, baseUrl).toString();

    // Create response that redirects
    const response = NextResponse.redirect(redirectUrl);

    clearAuthCookies(response);

    console.log('[DBG][do-logout] Redirecting to:', redirectUrl);
    console.log('[DBG][do-logout] Cleared session cookies');

    return response;
  } catch (error) {
    console.error('[DBG][do-logout] Error:', error);
    throw error;
  }
}
