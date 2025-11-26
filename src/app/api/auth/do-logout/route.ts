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
  const isProduction = process.env.NODE_ENV === 'production';

  // Cookie delete options - must match how they were set
  const deleteOptions: { path: string; domain?: string } = {
    path: '/',
  };

  // Set domain for production to match how cookie was set
  if (isProduction) {
    deleteOptions.domain = '.myyoga.guru';
  }

  // Use cookies.delete() - the recommended way to clear cookies in Next.js
  // This properly sets the cookie with maxAge=0 and expires in the past
  const cookiesToClear = [
    'authjs.session-token',
    'authjs.csrf-token',
    'authjs.callback-url',
    'pending_logout',
  ];

  for (const cookieName of cookiesToClear) {
    response.cookies.delete({ name: cookieName, ...deleteOptions });
  }

  console.log('[DBG][do-logout] Clearing cookies with options:', deleteOptions);
}

// POST handler - called from client-side fetch (kept for backwards compatibility)
export async function POST(request: NextRequest) {
  console.log('[DBG][do-logout] ========== LOGOUT POST HANDLER ==========');

  try {
    const cookies = request.cookies.getAll();
    console.log('[DBG][do-logout] Cookies in request:', cookies.map(c => c.name).join(', '));

    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    clearAuthCookies(response);

    return response;
  } catch (error) {
    console.error('[DBG][do-logout] Error:', error);
    return NextResponse.json({ success: false, message: 'Logout failed' }, { status: 500 });
  }
}

// GET handler - primary logout method via direct navigation
export async function GET(request: NextRequest) {
  console.log('[DBG][do-logout] ========== LOGOUT GET HANDLER ==========');

  try {
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    const { searchParams } = new URL(request.url);
    const returnTo = searchParams.get('returnTo') || '/';

    console.log('[DBG][do-logout] returnTo:', returnTo);

    const cookies = request.cookies.getAll();
    console.log('[DBG][do-logout] Cookies in request:', cookies.map(c => c.name).join(', '));

    // Build redirect URL
    const redirectUrl = returnTo.startsWith('http')
      ? returnTo
      : new URL(returnTo, baseUrl).toString();

    // Create redirect response with cookie clearing
    // Using redirect ensures browser processes Set-Cookie headers during redirect
    const response = NextResponse.redirect(redirectUrl);
    clearAuthCookies(response);

    console.log('[DBG][do-logout] Redirecting to:', redirectUrl);

    return response;
  } catch (error) {
    console.error('[DBG][do-logout] Error:', error);
    throw error;
  }
}
