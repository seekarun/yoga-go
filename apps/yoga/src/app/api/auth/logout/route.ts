/**
 * GET /api/auth/logout
 *
 * Logout endpoint that clears the session cookie and redirects to Cognito logout.
 * This ensures both the local session and Cognito session are cleared,
 * forcing a fresh login (with account selection) on next login attempt.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getCognitoUrls, cognitoConfig } from '@/lib/cognito';
import { BASE_URL, COOKIE_DOMAIN } from '@/config/env';

export async function GET(request: NextRequest) {
  console.log('[DBG][logout] ========== LOGOUT ==========');

  // Get redirect URL from query params, default to home
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get('returnTo') || '/';

  // Determine the current hostname
  const hostname = request.headers.get('host') || 'localhost:3111';
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  const currentUrl = `${protocol}://${hostname}`;

  // Cognito requires logout_uri to EXACTLY match one of the configured allowed logout URLs
  // Expert subdomains are NOT in the allowed list
  // So we ALWAYS use the main domain for Cognito logout, then redirect back
  const mainDomain = BASE_URL;

  // Store the full return URL (including subdomain) to redirect back after logout
  const finalPath = returnTo.startsWith('/') ? returnTo : `/${returnTo}`;
  const fullReturnUrl = `${currentUrl}${finalPath}`;

  console.log('[DBG][logout] Current URL:', currentUrl);
  console.log('[DBG][logout] Main domain for Cognito:', mainDomain);
  console.log('[DBG][logout] Full return URL:', fullReturnUrl);

  // Build Cognito logout URL - use MAIN DOMAIN as logout_uri (which is allowed in Cognito config)
  const cognitoUrls = getCognitoUrls();
  const cognitoLogoutUrl = new URL(cognitoUrls.logout);
  cognitoLogoutUrl.searchParams.set('client_id', cognitoConfig.clientId);
  cognitoLogoutUrl.searchParams.set('logout_uri', mainDomain);

  console.log('[DBG][logout] Cognito logout URL:', cognitoLogoutUrl.toString());

  // Create redirect response to Cognito logout
  const response = NextResponse.redirect(cognitoLogoutUrl.toString());

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
    ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
  });

  // Store the full return URL (including subdomain) in a cookie
  // After Cognito redirects to main domain, we'll redirect to the original subdomain
  if (fullReturnUrl !== mainDomain && fullReturnUrl !== `${mainDomain}/`) {
    response.cookies.set('post-logout-redirect', fullReturnUrl, {
      httpOnly: false, // Needs to be readable by client JS
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60, // 1 minute - should be used immediately
      ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
    });
  }

  console.log('[DBG][logout] Cookie cleared, isProduction:', isProduction);

  return response;
}
