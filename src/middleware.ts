import type { NextRequest } from 'next/server';
import { auth0 } from './lib/auth0';

/**
 * Middleware for authentication
 * This middleware:
 * 1. Automatically handles Auth0 routes (/auth/login, /auth/callback, /auth/logout)
 * 2. Manages session cookies and rolling sessions
 * 3. Redirects unauthenticated users to login for protected routes
 *
 * Protected routes:
 * - /app/* - User dashboard and authenticated pages
 * - /srv/* - Expert portal pages
 * - /data/app/* - API routes for authenticated users
 */
export async function middleware(request: NextRequest) {
  console.log('[DBG][middleware] Request to:', request.nextUrl.pathname);

  // Use Auth0's built-in middleware which handles:
  // - Authentication routes (/auth/login, /auth/callback, /auth/logout)
  // - Session management and rolling sessions
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    // Auth routes
    '/auth/:path*',
    // Protected app routes
    '/app/:path*',
    '/srv/:path*',
    // Protected API routes
    '/data/app/:path*',
    /*
     * Match all request paths except:
     * - api routes that don't need auth
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files
     */
  ],
};
