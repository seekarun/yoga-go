/**
 * Custom Auth0 Logout Handler
 *
 * This handler detects the current subdomain and creates a subdomain-specific
 * Auth0 client to ensure logout works correctly on all subdomains.
 */

import type { NextRequest } from 'next/server';
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import { getBaseUrlFromRequest } from '@/lib/utils';

const getDomain = () => {
  const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://placeholder.auth0.com';
  return issuerUrl.replace('https://', '');
};

export async function GET(request: NextRequest) {
  try {
    const dynamicBaseUrl = getBaseUrlFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const returnTo = searchParams.get('returnTo');

    if (returnTo) {
      const absoluteReturnTo = returnTo.startsWith('http')
        ? returnTo
        : `${dynamicBaseUrl}${returnTo}`;
      request.nextUrl.searchParams.set('returnTo', absoluteReturnTo);
    }

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

    return await auth0Subdomain.middleware(request);
  } catch (error) {
    console.error('[auth/logout] Error:', error);
    throw error;
  }
}
