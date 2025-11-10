/**
 * Custom Auth0 Login Handler
 *
 * This handler detects the current subdomain and creates a subdomain-specific
 * Auth0 client to ensure callbacks go to the correct subdomain.
 */

import type { NextRequest } from 'next/server';
import { Auth0Client } from '@auth0/nextjs-auth0/server';

// Safe domain extraction
const getDomain = () => {
  const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://placeholder.auth0.com';
  return issuerUrl.replace('https://', '');
};

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/login] Custom subdomain-aware login handler');

  try {
    // Get the current hostname to determine which subdomain we're on
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const dynamicBaseUrl = `${protocol}://${hostname}`;

    console.log('[DBG][auth/login] Current hostname:', hostname);
    console.log('[DBG][auth/login] Dynamic base URL:', dynamicBaseUrl);

    // Create a subdomain-specific Auth0 client
    const auth0Subdomain = new Auth0Client({
      domain: getDomain(),
      clientId: process.env.AUTH0_CLIENT_ID || 'placeholder',
      clientSecret: process.env.AUTH0_CLIENT_SECRET || 'placeholder',
      appBaseUrl: dynamicBaseUrl, // Use the current subdomain's URL
      secret: process.env.AUTH0_SECRET || 'placeholder-secret-at-least-32-characters-long',
      routes: {
        callback: '/auth/callback',
        login: '/auth/login',
        logout: '/auth/logout',
      },
    });

    // Use the Auth0 SDK's middleware to handle the login
    // This will redirect to Auth0 with the correct redirect_uri for this subdomain
    return await auth0Subdomain.middleware(request);
  } catch (error) {
    console.error('[DBG][auth/login] Error:', error);
    throw error;
  }
}
