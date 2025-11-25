/**
 * Custom Logout Handler
 *
 * Signs out from both NextAuth and Cognito.
 * Clears NextAuth session cookies and redirects to Cognito logout endpoint.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

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

    // Build Cognito logout URL to fully clear the Cognito session
    const cognitoDomain = process.env.COGNITO_DOMAIN || 'yoga-go-auth';
    const cognitoRegion = process.env.AWS_REGION || 'ap-southeast-2';
    const cognitoClientId = process.env.COGNITO_CLIENT_ID;

    // Determine redirect URL
    let redirectUrl: string;

    if (!cognitoClientId) {
      console.log('[DBG][auth/logout] No Cognito client ID, redirecting to:', returnTo);
      redirectUrl = returnTo;
    } else {
      // Cognito logout endpoint - clears Cognito session cookies
      // logout_uri must exactly match one of the registered Sign out URL(s) in Cognito
      const logoutUri = returnTo.endsWith('/') ? returnTo.slice(0, -1) : returnTo;

      const cognitoLogoutUrl = new URL(
        `https://${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com/logout`
      );
      cognitoLogoutUrl.searchParams.set('client_id', cognitoClientId);
      cognitoLogoutUrl.searchParams.set('logout_uri', logoutUri);

      console.log('[DBG][auth/logout] Redirecting to Cognito logout:', cognitoLogoutUrl.toString());
      redirectUrl = cognitoLogoutUrl.toString();
    }

    // Create redirect response
    const response = NextResponse.redirect(redirectUrl);

    // Clear NextAuth session cookies
    // NextAuth v5 uses different cookie names based on environment:
    // - Development (HTTP): 'authjs.session-token'
    // - Production (HTTPS): '__Secure-authjs.session-token'
    const isSecure = protocol === 'https';

    // All possible NextAuth cookie names
    const cookiesToClear = [
      // Non-secure cookies (localhost/development)
      'authjs.session-token',
      'authjs.csrf-token',
      'authjs.callback-url',
      // Secure cookies (production HTTPS)
      '__Secure-authjs.session-token',
      '__Secure-authjs.callback-url',
      '__Host-authjs.csrf-token',
    ];

    // Clear all cookies using delete() method with matching attributes
    for (const cookieName of cookiesToClear) {
      // Use delete() which properly removes the cookie
      response.cookies.delete({
        name: cookieName,
        path: '/',
        secure: isSecure,
        httpOnly: true,
        sameSite: 'lax',
      });
    }

    console.log('[DBG][auth/logout] Cleared NextAuth cookies, isSecure:', isSecure);

    return response;
  } catch (error) {
    console.error('[DBG][auth/logout] Error:', error);
    throw error;
  }
}
