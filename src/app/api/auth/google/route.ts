/**
 * Google OAuth Redirect Endpoint
 * Redirects to Cognito Hosted UI with Google as the identity provider
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cognitoConfig } from '@/lib/cognito';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/google] Initiating Google OAuth flow');

  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get('callbackUrl') || '/app';

  // Determine the base URL for redirect
  const hostname = request.headers.get('host') || 'localhost:3111';
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  const baseUrl = `${protocol}://${hostname}`;

  // Cognito Hosted UI domain
  const domain = `yoga-go-auth.auth.${cognitoConfig.region}.amazoncognito.com`;
  const redirectUri = `${baseUrl}/api/auth/google/callback`;

  // Build the OAuth URL with Google as identity provider
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri,
    identity_provider: 'Google',
    state: callbackUrl, // Preserve the callback URL in state
  });

  const googleOAuthUrl = `https://${domain}/oauth2/authorize?${params.toString()}`;

  console.log('[DBG][auth/google] Config:', {
    clientId: cognitoConfig.clientId,
    region: cognitoConfig.region,
    hostname,
    baseUrl,
    redirectUri,
  });
  console.log('[DBG][auth/google] Redirecting to:', googleOAuthUrl);

  return NextResponse.redirect(googleOAuthUrl);
}
