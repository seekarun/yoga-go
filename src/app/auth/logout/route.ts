/**
 * Custom Logout Handler
 *
 * Signs out from NextAuth and redirects to home.
 * Cognito session cookies will expire naturally.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { signOut } from '@/auth';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/logout] Logout handler');

  try {
    // Get the current hostname to determine returnTo URL
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    // Get returnTo parameter from query string
    const searchParams = request.nextUrl.searchParams;
    const returnToParam = searchParams.get('returnTo');

    // Convert relative path to absolute URL
    const returnTo = returnToParam
      ? returnToParam.startsWith('http')
        ? returnToParam
        : `${baseUrl}${returnToParam}`
      : baseUrl;

    console.log('[DBG][auth/logout] Return to:', returnTo);

    // Sign out from NextAuth (clears local session)
    try {
      await signOut({ redirect: false });
      console.log('[DBG][auth/logout] Signed out from NextAuth');
    } catch {
      // signOut might throw if there's no session, that's ok
      console.log('[DBG][auth/logout] No active session to sign out from');
    }

    // Redirect to home (or returnTo URL)
    return NextResponse.redirect(returnTo);
  } catch (error) {
    console.error('[DBG][auth/logout] Error:', error);
    throw error;
  }
}
