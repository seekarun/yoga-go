/**
 * Auth Callback Handler
 *
 * This route processes the pending-oauth-role cookie after OAuth completes.
 * With NextAuth, the OAuth callback is handled by /api/auth/callback/cognito.
 * This route handles the post-auth user creation with role assignment.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getOrCreateUser } from '@/lib/auth';
import { jwtVerify } from 'jose';
import type { UserRole } from '@/types';
import { isPrimaryDomain } from '@/config/domains';

// Cookie name for pending OAuth auth data
const PENDING_OAUTH_COOKIE = 'pending-oauth-role';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/callback] Processing auth callback');

  try {
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    // Get the current session
    const session = await auth();

    console.log('[DBG][auth/callback] Session:', session ? 'exists' : 'null');

    if (!session?.user) {
      console.log('[DBG][auth/callback] No session, redirecting to login');
      return NextResponse.redirect(new URL('/auth/login', baseUrl));
    }

    console.log('[DBG][auth/callback] User:', session.user.cognitoSub);

    // Determine redirect based on domain:
    // - Main domain: always /srv (expert portal)
    // - Expert subdomain: always /app (learner dashboard)
    const isMainDomain = isPrimaryDomain(hostname);
    const redirectTo = isMainDomain ? '/srv' : '/app';

    console.log('[DBG][auth/callback] Redirect decision:', { hostname, isMainDomain, redirectTo });

    let roles: UserRole[] = ['learner'];

    // Check for pending-oauth-role cookie (instead of MongoDB PendingAuth)
    const pendingOAuthCookie = request.cookies.get(PENDING_OAUTH_COOKIE);

    if (pendingOAuthCookie?.value) {
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jwtVerify(pendingOAuthCookie.value, secret);

        if (payload.roles) {
          roles = payload.roles as UserRole[];
          console.log('[DBG][auth/callback] Retrieved roles from cookie:', roles);
        }
      } catch (cookieError) {
        console.error('[DBG][auth/callback] Error reading pending-oauth-role cookie:', cookieError);
        // Continue with default role
      }
    }

    console.log('[DBG][auth/callback] Creating/updating user with roles:', roles);

    // Create or update user in DynamoDB
    await getOrCreateUser(
      {
        sub: session.user.cognitoSub!,
        email: session.user.email!,
        name: session.user.name || undefined,
        picture: session.user.image || undefined,
      },
      roles
    );

    console.log('[DBG][auth/callback] User created/updated successfully');

    // Create redirect response and delete the pending-oauth-role cookie
    const response = NextResponse.redirect(new URL(redirectTo, baseUrl));

    // Delete the pending-oauth-role cookie
    response.cookies.delete(PENDING_OAUTH_COOKIE);

    return response;
  } catch (error) {
    console.error('[DBG][auth/callback] Error:', error);
    throw error;
  }
}
