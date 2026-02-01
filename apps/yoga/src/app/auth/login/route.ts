/**
 * Custom Cognito Login Handler
 *
 * Supports two flows:
 * 1. Expert flow: Check for pending-oauth-role cookie (set by expert signup validation)
 * 2. Learner flow: Default role
 *
 * Stores the intended role in a signed cookie and redirects to Cognito via NextAuth.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '@/types';

// Cookie name for pending OAuth auth data
const PENDING_OAUTH_COOKIE = 'pending-oauth-role';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/login] Cognito login handler');

  try {
    // Get the current hostname
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    console.log('[DBG][auth/login] Hostname:', hostname);

    // Check for parameters
    const searchParams = request.nextUrl.searchParams;
    const roleParam = searchParams.get('role');
    const codeParam = searchParams.get('code');
    const callbackUrl = searchParams.get('callbackUrl');

    let roles: UserRole[] = ['learner']; // Default role

    // Check for pending-oauth-role cookie (from expert signup validation)
    const pendingOAuthCookie = request.cookies.get(PENDING_OAUTH_COOKIE);

    if (pendingOAuthCookie?.value) {
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jwtVerify(pendingOAuthCookie.value, secret);

        if (payload.roles && payload.validated) {
          roles = payload.roles as UserRole[];
          console.log('[DBG][auth/login] Found validated expert role from cookie:', roles);
        }
      } catch (cookieError) {
        console.error('[DBG][auth/login] Error reading pending-oauth-role cookie:', cookieError);
        // Continue with default role
      }
    }
    // Legacy flow - validate code directly (backward compatibility)
    else if (roleParam === 'expert') {
      console.log('[DBG][auth/login] Expert signup requested (legacy flow), validating code...');

      const expectedCode = process.env.EXPERT_SIGNUP_CODE;

      if (!expectedCode) {
        console.error('[DBG][auth/login] EXPERT_SIGNUP_CODE not configured in environment!');
        return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
      }

      if (codeParam !== expectedCode) {
        console.log('[DBG][auth/login] Invalid expert signup code provided');
        return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
      }

      console.log('[DBG][auth/login] Expert signup code validated successfully');
      roles = ['learner', 'expert']; // Expert users also have learner role
    }

    // Create a new signed cookie to carry the role through the OAuth flow
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const signedToken = await new SignJWT({
      roles,
      forOAuth: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m') // 10 minutes expiry
      .setIssuedAt()
      .sign(secret);

    console.log('[DBG][auth/login] Created pending OAuth role:', roles);

    // Construct redirect URL to go through /auth/callback for proper user creation
    // Default to /srv (expert portal) since myyoga.guru targets yoga experts
    const finalDestination = callbackUrl || '/srv';
    const callbackPath = `/auth/callback?redirectTo=${encodeURIComponent(finalDestination)}`;

    // Build the Cognito OAuth URL manually
    // NextAuth's signIn('cognito') would redirect, but we need to set a cookie first
    const cognitoSignInUrl = `/api/auth/signin/cognito?callbackUrl=${encodeURIComponent(callbackPath)}`;

    console.log('[DBG][auth/login] Redirecting to Cognito OAuth');
    console.log('[DBG][auth/login] Callback path after auth:', callbackPath);

    // Create redirect response with the cookie set
    const response = NextResponse.redirect(new URL(cognitoSignInUrl, baseUrl));

    // Set cookie with pending OAuth role
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      path: string;
      maxAge: number;
      domain?: string;
    } = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    };

    // Set domain for production
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.domain = '.myyoga.guru';
    }

    response.cookies.set(PENDING_OAUTH_COOKIE, signedToken, cookieOptions);

    return response;
  } catch (error) {
    console.error('[DBG][auth/login] Error:', error);
    throw error;
  }
}
