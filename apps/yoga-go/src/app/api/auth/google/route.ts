/**
 * Google OAuth Redirect Endpoint
 * Redirects to Cognito Hosted UI with Google as the identity provider
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cognitoConfig } from '@/lib/cognito';
import { BASE_URL } from '@/config/env';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/google] Initiating Google OAuth flow');

  const searchParams = request.nextUrl.searchParams;
  // Default to /srv since all signups are expert signups
  const callbackUrl = searchParams.get('callbackUrl') || '/srv';

  // Determine the current hostname
  const hostname = request.headers.get('host') || 'localhost:3111';
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  const currentUrl = `${protocol}://${hostname}`;

  // Cognito requires redirect_uri to EXACTLY match one of the configured callback URLs
  // Expert subdomains are NOT in the allowed list
  // So we ALWAYS use the main domain for redirect_uri
  const mainDomain = BASE_URL;

  // Cognito Hosted UI domain - use custom domain if configured
  const domain =
    process.env.COGNITO_DOMAIN || `yoga-go-auth.auth.${cognitoConfig.region}.amazoncognito.com`;
  const redirectUri = `${mainDomain}/api/auth/google/callback`;

  // Store both the callback path AND the original domain in state
  // Format: callbackUrl|originDomain (e.g., "/srv|https://myyoga.myyoga.guru")
  const stateData = currentUrl !== mainDomain ? `${callbackUrl}|${currentUrl}` : callbackUrl;

  // Build the OAuth URL with Google as identity provider
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: 'code',
    scope: 'email openid profile',
    redirect_uri: redirectUri,
    identity_provider: 'Google',
    state: stateData, // Preserve callback URL and origin domain in state
    // Force Google to show account selection every time
    prompt: 'select_account',
  });

  const googleOAuthUrl = `https://${domain}/oauth2/authorize?${params.toString()}`;

  console.log('[DBG][auth/google] Config:', {
    clientId: cognitoConfig.clientId,
    region: cognitoConfig.region,
    hostname,
    currentUrl,
    mainDomain,
    redirectUri,
    callbackUrl,
    stateData,
  });
  console.log('[DBG][auth/google] State being sent:', stateData);
  console.log('[DBG][auth/google] Redirecting to:', googleOAuthUrl);

  return NextResponse.redirect(googleOAuthUrl);
}
