/**
 * Facebook OAuth Callback Handler
 * Handles the callback from Cognito after Facebook authentication
 * Exchanges the authorization code for tokens and creates the session
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { encode } from 'next-auth/jwt';
import { cognitoConfig } from '@/lib/cognito';
import { getOrCreateUser } from '@/lib/auth';
import { getSubdomainFromMyYogaGuru, isPrimaryDomain } from '@/config/domains';
import { BASE_URL, COOKIE_DOMAIN } from '@/config/env';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/facebook/callback] Processing Facebook OAuth callback');

  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state'); // Contains the callback URL
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

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

  console.log('[DBG][auth/facebook/callback] Parsed state:', { callbackPath, originDomain });

  // Extract expertId from origin domain if it's an expert subdomain
  let signupExpertId: string | null = null;
  try {
    const originUrl = new URL(originDomain);
    const originHost = originUrl.host;
    // Check if origin is an expert subdomain (not primary domain)
    if (!isPrimaryDomain(originHost)) {
      signupExpertId = getSubdomainFromMyYogaGuru(originHost);
      console.log(
        '[DBG][auth/facebook/callback] Detected expert subdomain signup:',
        signupExpertId
      );
    }
  } catch {
    console.log('[DBG][auth/facebook/callback] Could not parse origin domain:', originDomain);
  }

  // Use main domain for redirect_uri (must match what was sent in initial request)
  const mainDomain = BASE_URL;
  const baseUrl = mainDomain;

  // Handle errors from Cognito
  if (error) {
    console.error('[DBG][auth/facebook/callback] OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/auth/signin?error=${encodeURIComponent(errorDescription || error)}`, baseUrl)
    );
  }

  if (!code) {
    console.error('[DBG][auth/facebook/callback] No authorization code received');
    return NextResponse.redirect(new URL('/auth/signin?error=No authorization code', baseUrl));
  }

  try {
    // Exchange authorization code for tokens - use custom domain if configured
    const domain =
      process.env.COGNITO_DOMAIN || `yoga-go-auth.auth.${cognitoConfig.region}.amazoncognito.com`;
    const tokenUrl = `https://${domain}/oauth2/token`;
    const redirectUri = `${baseUrl}/api/auth/facebook/callback`;

    console.log('[DBG][auth/facebook/callback] Exchanging code for tokens');

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
      console.error('[DBG][auth/facebook/callback] Token exchange failed:', errorText);
      return NextResponse.redirect(new URL('/auth/signin?error=Authentication failed', baseUrl));
    }

    const tokens = await tokenResponse.json();
    console.log('[DBG][auth/facebook/callback] Tokens received');

    // Decode the ID token to get user info (it's a JWT)
    const idToken = tokens.id_token;
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());

    console.log('[DBG][auth/facebook/callback] User info from token:', {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
    });

    // All new users start as learners only
    // Expert role is added when they complete onboarding at /srv/new
    // This ensures role.includes('expert') is always reliable
    const roles: ('learner' | 'expert' | 'admin')[] = ['learner'];

    console.log('[DBG][auth/facebook/callback] Creating user with roles:', roles);

    // Create or update user in DynamoDB
    const signupExperts = signupExpertId ? [signupExpertId] : undefined;
    const user = await getOrCreateUser(
      {
        sub: payload.sub,
        email: payload.email,
        name: payload.name || payload.email?.split('@')[0],
        picture: payload.picture,
      },
      roles,
      signupExperts
    );

    console.log(
      '[DBG][auth/facebook/callback] User created/updated:',
      user.id,
      'roles:',
      roles,
      'signupExpertId:',
      signupExpertId || 'none'
    );

    // Note: Welcome email is sent by DynamoDB stream Lambda (user-welcome-stream)
    // when the USER record is created above

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

    // Determine redirect path based on context:
    // 1. On expert subdomain: ALL users are treated as learners (go to /)
    // 2. On main domain: experts with completed onboarding go to /srv, others to /app
    const isOnExpertSubdomain = !!signupExpertId;

    let finalPath: string;
    if (isOnExpertSubdomain) {
      // On expert subdomain, everyone is a learner - go to landing page
      finalPath = '/';
    } else {
      // On main domain, check if user is an active expert
      const hasExpertRole = Array.isArray(user.role)
        ? user.role.includes('expert')
        : user.role === 'expert';
      const hasCompletedOnboarding = !!user.expertProfile;
      const isActiveExpert = hasExpertRole && hasCompletedOnboarding;
      finalPath = isActiveExpert ? '/srv' : '/app';
    }

    console.log('[DBG][auth/facebook/callback] Redirect path decision:', {
      callbackPath,
      isOnExpertSubdomain,
      signupExpertId,
      finalPath,
    });

    // Build final redirect URL using origin domain (could be subdomain) + callback path
    const finalRedirectUrl = new URL(finalPath, originDomain);

    console.log(
      '[DBG][auth/facebook/callback] Creating session and redirecting to:',
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

    // Set domain for production to work across subdomains
    // IMPORTANT: Must match logout route domain setting for cookie to be cleared properly
    if (COOKIE_DOMAIN) {
      cookieOptions.domain = COOKIE_DOMAIN;
    }

    response.cookies.set('authjs.session-token', sessionToken, cookieOptions);
    console.log('[DBG][auth/facebook/callback] Cookie set with options:', cookieOptions);

    return response;
  } catch (error) {
    console.error('[DBG][auth/facebook/callback] Error:', error);
    return NextResponse.redirect(new URL('/auth/signin?error=Authentication failed', baseUrl));
  }
}
