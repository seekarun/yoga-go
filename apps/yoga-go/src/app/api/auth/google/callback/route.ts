/**
 * Google OAuth Callback Handler
 * Handles the callback from Cognito after Google authentication
 * Exchanges the authorization code for tokens and creates the session
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { cognitoConfig } from '@/lib/cognito';
import { getOrCreateUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/google/callback] Processing Google OAuth callback');

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Contains the callback URL
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Debug: Log all query params to understand what's coming back from Cognito
  console.log(
    '[DBG][auth/google/callback] All query params:',
    Object.fromEntries(searchParams.entries())
  );
  console.log('[DBG][auth/google/callback] State parameter value:', state);

  // Determine base URL
  const hostname = request.headers.get('host') || 'localhost:3111';
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  const currentUrl = `${protocol}://${hostname}`;

  // Parse state to extract callback URL and origin domain
  // Format: "callbackUrl|originDomain" or just "callbackUrl"
  let callbackPath = '/srv';
  let originDomain = currentUrl;

  if (state) {
    if (state.includes('|')) {
      const [path, origin] = state.split('|');
      callbackPath = path || '/srv';
      originDomain = origin || currentUrl;
    } else {
      callbackPath = state;
    }
  }

  console.log('[DBG][auth/google/callback] Parsed state:', { callbackPath, originDomain });

  // Use main domain for redirect_uri (must match what was sent in initial request)
  const isLocalhost = hostname.includes('localhost');
  const mainDomain = isLocalhost ? 'http://localhost:3111' : 'https://myyoga.guru';
  const baseUrl = mainDomain;

  // Handle errors from Cognito
  if (error) {
    console.error('[DBG][auth/google/callback] OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
    );
  }

  if (!code) {
    console.error('[DBG][auth/google/callback] No authorization code received');
    return NextResponse.redirect(new URL('/auth/signin?error=No authorization code', baseUrl));
  }

  try {
    // Exchange authorization code for tokens - use custom domain if configured
    const domain =
      process.env.COGNITO_DOMAIN || `yoga-go-auth.auth.${cognitoConfig.region}.amazoncognito.com`;
    const tokenUrl = `https://${domain}/oauth2/token`;
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    console.log('[DBG][auth/google/callback] Exchanging code for tokens');

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: cognitoConfig.clientId,
        client_secret: cognitoConfig.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[DBG][auth/google/callback] Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/auth/signin?error=Authentication failed', baseUrl));
    }

    const tokens = await tokenResponse.json();
    console.log('[DBG][auth/google/callback] Tokens received');

    // Decode the ID token to get user info (it's a JWT)
    const idToken = tokens.id_token;
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    console.log('[DBG][auth/google/callback] User info from token:', {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    // All signups on this domain are expert signups
    const roles: ('learner' | 'expert' | 'admin')[] = ['learner', 'expert'];

    console.log('[DBG][auth/google/callback] Creating user with roles:', roles);

    // Create or update user in MongoDB
    const user = await getOrCreateUser(
      {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split('@')[0],
        picture: payload.picture,
      },
      roles // Use roles array
    );

    console.log('[DBG][auth/google/callback] User created/updated:', user.id, 'roles:', roles);

    // Create session token using NextAuth's encode function
    // This ensures compatibility with /api/auth/me which uses decode
    const sessionToken = await encode({
      token: {
        cognitoSub: payload.sub,
        email: user.profile.email,
        name: user.profile.name,
        picture: user.profile.avatar,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    });

    // Build final redirect URL using origin domain (could be subdomain) + callback path
    const finalRedirectUrl = new URL(callbackPath, originDomain);

    console.log(
      '[DBG][auth/google/callback] Creating session and redirecting to:',
      finalRedirectUrl.toString()
    );

    // Create response with redirect
    const response = NextResponse.redirect(finalRedirectUrl.toString());

    // Set session cookie with the name NextAuth expects
    // IMPORTANT: Cookie settings must match logout route exactly for proper session clearing
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      path: string;
      maxAge: number;
      domain?: string;
    } = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days (matches email login)
    };

    // Set domain for production to work across www.myyoga.guru and myyoga.guru
    // IMPORTANT: Must match logout route domain setting for cookie to be cleared properly
    if (isProduction) {
      cookieOptions.domain = '.myyoga.guru';
    }

    response.cookies.set('authjs.session-token', sessionToken, cookieOptions);
    console.log('[DBG][auth/google/callback] Cookie set with options:', cookieOptions);

    return response;
  } catch (error) {
    console.error('[DBG][auth/google/callback] Error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=Authentication failed', baseUrl));
  }
}
