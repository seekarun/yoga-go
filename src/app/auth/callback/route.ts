/**
 * Custom Auth0 Callback Handler
 *
 * This route handles the Auth0 callback with subdomain awareness.
 * After Auth0 authentication, it creates users with appropriate roles:
 * - admin.myyoga.guru → creates expert role
 * - myyoga.guru → creates learner role
 *
 * Then redirects users based on subdomain:
 * - Admin subdomain → /srv
 * - Main subdomain → /app
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getOrCreateUser } from '@/lib/auth';
import type { UserRole } from '@/types';

// Safe domain extraction
const getDomain = () => {
  const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://placeholder.auth0.com';
  return issuerUrl.replace('https://', '');
};

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/callback] Processing Auth0 callback with subdomain awareness');

  try {
    // Get the current hostname to create subdomain-specific Auth0 client
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const dynamicBaseUrl = `${protocol}://${hostname}`;

    console.log('[DBG][auth/callback] Current hostname:', hostname);
    console.log('[DBG][auth/callback] Dynamic base URL:', dynamicBaseUrl);

    // Create subdomain-specific Auth0 client
    const auth0Subdomain = new Auth0Client({
      domain: getDomain(),
      clientId: process.env.AUTH0_CLIENT_ID || 'placeholder',
      clientSecret: process.env.AUTH0_CLIENT_SECRET || 'placeholder',
      appBaseUrl: dynamicBaseUrl,
      secret: process.env.AUTH0_SECRET || 'placeholder-secret-at-least-32-characters-long',
      routes: {
        callback: '/auth/callback',
        login: '/auth/login',
        logout: '/auth/logout',
      },
    });

    // Handle the callback - this sets the session cookie and returns a redirect response
    const callbackResponse = await auth0Subdomain.middleware(request);

    // Get session to extract user info and create/update user in MongoDB
    const session = await auth0Subdomain.getSession(request);

    if (session?.user) {
      console.log('[DBG][auth/callback] Session user:', session.user.sub);

      // Determine role based on subdomain
      const { isAdminDomain } = await import('@/config/domains');
      const isAdmin = isAdminDomain(hostname);
      const role: UserRole = isAdmin ? 'expert' : 'learner';

      console.log('[DBG][auth/callback] Creating/updating user with role:', role);

      // Create or update user in MongoDB with appropriate role
      await getOrCreateUser(
        {
          sub: session.user.sub,
          email: session.user.email!,
          name: session.user.name,
          picture: session.user.picture,
        },
        role
      );

      console.log('[DBG][auth/callback] User created/updated successfully');
    }

    // Redirect based on current subdomain
    // - If on admin subdomain → redirect to /srv
    // - If on main subdomain → redirect to /app
    const { isAdminDomain } = await import('@/config/domains');
    const isAdmin = isAdminDomain(hostname);
    const redirectPath = isAdmin ? '/srv' : '/app';

    console.log('[DBG][auth/callback] Subdomain-based redirect to:', redirectPath);

    // Modify the redirect URL in the callback response
    if (callbackResponse.status === 302 || callbackResponse.status === 307) {
      const redirectUrl = `${protocol}://${hostname}${redirectPath}`;
      const modifiedResponse = NextResponse.redirect(redirectUrl);

      // Preserve session cookies from the Auth0 callback
      const cookies = callbackResponse.headers.get('set-cookie');
      if (cookies) {
        modifiedResponse.headers.set('set-cookie', cookies);
      }

      console.log('[DBG][auth/callback] Modified redirect to:', redirectUrl);
      return modifiedResponse;
    }

    // If not a redirect response, return as-is
    return callbackResponse;
  } catch (error) {
    console.error('[DBG][auth/callback] Error in callback handler:', error);
    throw error;
  }
}
