import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';

/**
 * Middleware for authentication and domain-based routing
 * This middleware:
 * 1. Handles domain-based routing (multi-domain support)
 * 2. Automatically handles Auth0 routes (/auth/login, /auth/callback, /auth/logout)
 * 3. Manages session cookies and rolling sessions
 * 4. Redirects unauthenticated users to login for protected routes
 *
 * Domain routing:
 * - yogago.com -> serves default routes (/)
 * - kavithayoga.com -> redirects to /experts/kavitha
 *
 * Protected routes:
 * - /app/* - User dashboard and authenticated pages
 * - /srv/* - Expert portal pages
 * - /data/app/* - API routes for authenticated users
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  console.log('[DBG][middleware] Request to:', pathname, 'from:', hostname);

  // Handle domain-based routing
  // Check if request is from a custom domain (not localhost or primary domain)
  const isLocalhost = hostname.includes('localhost') || hostname.includes('127.0.0.1');
  const _isPrimaryDomain = hostname.includes('yogago.com');

  // Handle kavithayoga.com domain
  if (!isLocalhost && hostname.includes('kavithayoga.com')) {
    // If user is accessing root or already on expert page, allow it
    if (pathname === '/' || pathname.startsWith('/experts/kavitha')) {
      // Rewrite to expert page but keep URL as-is
      if (pathname === '/') {
        const url = request.nextUrl.clone();
        url.pathname = '/experts/kavitha';
        console.log('[DBG][middleware] Rewriting kavithayoga.com root to /experts/kavitha');
        return NextResponse.rewrite(url);
      }
    }
    // For other paths on this domain, redirect to expert page
    else if (!pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
      const url = request.nextUrl.clone();
      url.pathname = '/experts/kavitha';
      console.log('[DBG][middleware] Redirecting kavithayoga.com path to /experts/kavitha');
      return NextResponse.redirect(url);
    }
  }

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
