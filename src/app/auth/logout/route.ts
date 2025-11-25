/**
 * Custom Logout Handler
 *
 * Two-phase logout:
 * Phase 1: Redirect to Cognito logout (clears Cognito session)
 * Phase 2: When Cognito redirects back, NextAuth signout happens via middleware
 *
 * Uses a cookie to track logout state since Cognito logout_uri must be exact match.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/logout] ========== LOGOUT HANDLER START ==========');

  try {
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    console.log('[DBG][auth/logout] hostname:', hostname);
    console.log('[DBG][auth/logout] protocol:', protocol);
    console.log('[DBG][auth/logout] baseUrl:', baseUrl);

    // Log all cookies present in the request
    const cookies = request.cookies.getAll();
    console.log('[DBG][auth/logout] Cookies in request:', cookies.map(c => c.name).join(', '));

    const cognitoDomain = process.env.COGNITO_DOMAIN || 'yoga-go-auth';
    const cognitoRegion = process.env.AWS_REGION || 'ap-southeast-2';
    const cognitoClientId = process.env.COGNITO_CLIENT_ID;

    console.log('[DBG][auth/logout] cognitoClientId:', cognitoClientId ? 'set' : 'not set');

    // If no Cognito, just clear NextAuth session
    if (!cognitoClientId) {
      console.log('[DBG][auth/logout] No Cognito, redirecting to NextAuth signout');
      const signOutUrl = new URL('/api/auth/signout', baseUrl);
      signOutUrl.searchParams.set('callbackUrl', baseUrl);
      return NextResponse.redirect(signOutUrl.toString());
    }

    // Redirect to Cognito logout
    // logout_uri must exactly match registered URL (no query params)
    const logoutUri = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    const cognitoLogoutUrl = new URL(
      `https://${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com/logout`
    );
    cognitoLogoutUrl.searchParams.set('client_id', cognitoClientId);
    cognitoLogoutUrl.searchParams.set('logout_uri', logoutUri);

    console.log('[DBG][auth/logout] Cognito logout URL:', cognitoLogoutUrl.toString());

    // Create response that redirects to Cognito logout
    const response = NextResponse.redirect(cognitoLogoutUrl.toString());

    // Set a cookie to signal that we need to clear NextAuth session when we return
    // This cookie will be checked by middleware
    response.cookies.set('pending_logout', '1', {
      path: '/',
      maxAge: 60, // 1 minute - should be enough for the redirect
      httpOnly: true,
    });

    // Also clear NextAuth cookies now (before Cognito redirect)
    const cookiesToClear = ['authjs.session-token', 'authjs.csrf-token', 'authjs.callback-url'];

    for (const cookieName of cookiesToClear) {
      response.cookies.set(cookieName, '', {
        path: '/',
        maxAge: 0,
      });
    }

    console.log('[DBG][auth/logout] Set pending_logout cookie and cleared NextAuth cookies');
    console.log('[DBG][auth/logout] ========== LOGOUT HANDLER END ==========');

    return response;
  } catch (error) {
    console.error('[DBG][auth/logout] Error:', error);
    throw error;
  }
}
