/**
 * Custom Logout Handler
 *
 * Signs out from both NextAuth and Cognito.
 * Redirects to Cognito logout endpoint to fully clear the session.
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

    // Build Cognito logout URL to fully clear the Cognito session
    const cognitoDomain = process.env.COGNITO_DOMAIN || 'yoga-go-auth';
    const cognitoRegion = process.env.AWS_REGION || 'ap-southeast-2';
    const cognitoClientId = process.env.COGNITO_CLIENT_ID;

    // For localhost, redirect directly home (Cognito doesn't allow localhost logout_uri)
    if (hostname.includes('localhost') || !cognitoClientId) {
      console.log('[DBG][auth/logout] Local/no-cognito mode, redirecting to:', returnTo);
      return NextResponse.redirect(returnTo);
    }

    // Cognito logout endpoint - clears Cognito session cookies
    // logout_uri must be registered in Cognito app client's logout URLs
    const cognitoLogoutUrl = new URL(
      `https://${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com/logout`
    );
    cognitoLogoutUrl.searchParams.set('client_id', cognitoClientId);
    cognitoLogoutUrl.searchParams.set('logout_uri', returnTo);

    console.log('[DBG][auth/logout] Redirecting to Cognito logout:', cognitoLogoutUrl.toString());

    return NextResponse.redirect(cognitoLogoutUrl.toString());
  } catch (error) {
    console.error('[DBG][auth/logout] Error:', error);
    throw error;
  }
}
