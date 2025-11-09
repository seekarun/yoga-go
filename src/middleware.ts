import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';
import {
  getExpertIdFromHostname,
  isPrimaryDomain,
  isAdminDomain,
  getSubdomainFromMyYogaGuru,
} from './config/domains';

/**
 * Middleware for authentication and domain-based routing
 * This middleware:
 * 1. Handles domain-based routing (multi-domain expert isolation)
 * 2. Automatically handles Auth0 routes (/auth/login, /auth/callback, /auth/logout)
 * 3. Manages session cookies and rolling sessions
 * 4. Redirects unauthenticated users to login for protected routes
 *
 * Domain routing:
 * - yogago.com / localhost -> serves all routes (full platform)
 * - admin.myyoga.guru -> redirects to /srv (expert portal)
 * - {subdomain}.myyoga.guru -> ONLY /experts/{subdomain} content (dynamic)
 * - kavithayoga.com -> ONLY /experts/kavitha content (isolated)
 * - deepakyoga.com -> ONLY /experts/deepak content (isolated)
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

  // Handle admin domain routing (admin.myyoga.guru -> /srv)
  const isAdmin = isAdminDomain(hostname);
  if (isAdmin) {
    console.log('[DBG][middleware] Admin domain detected');

    // Allow Next.js internals and API routes
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      return await auth0.middleware(request);
    }

    // Allow static assets
    if (pathname.startsWith('/public') || pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      return NextResponse.next();
    }

    // Rewrite paths to /srv (keeps URL clean)
    if (!pathname.startsWith('/srv')) {
      const url = request.nextUrl.clone();
      // Root path: Rewrite to /srv
      if (pathname === '/') {
        url.pathname = '/srv';
      } else {
        // Other paths: Rewrite to /srv/{path}
        url.pathname = `/srv${pathname}`;
      }
      console.log(`[DBG][middleware] Rewriting ${pathname} to ${url.pathname} for admin domain`);
      return NextResponse.rewrite(url);
    }

    // /srv routes: Allow through Auth0 middleware
    return await auth0.middleware(request);
  }

  // Check if this is a dynamic myyoga.guru subdomain (e.g., deepak.myyoga.guru)
  const myYogaGuruSubdomain = getSubdomainFromMyYogaGuru(hostname);
  let expertId = myYogaGuruSubdomain;
  let isExpertDomain = expertId !== null;

  // If not a myyoga.guru subdomain, check configured expert domains (e.g., kavithayoga.com)
  if (!expertId) {
    expertId = getExpertIdFromHostname(hostname);
    isExpertDomain = expertId !== null;
  }

  const isPrimary = isPrimaryDomain(hostname);

  console.log(
    '[DBG][middleware] Expert domain:',
    isExpertDomain,
    'Expert ID:',
    expertId,
    'Is primary:',
    isPrimary,
    'MyYoga.Guru subdomain:',
    myYogaGuruSubdomain
  );

  // Handle expert domain routing (domain isolation)
  if (isExpertDomain && expertId) {
    // Allow Next.js internals and API routes
    if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
      // Continue to Auth0 middleware for protected API routes
      return await auth0.middleware(request);
    }

    // Allow static assets
    if (pathname.startsWith('/public') || pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      return NextResponse.next();
    }

    const expertPath = `/experts/${expertId}`;

    // Root path: Rewrite to expert page (URL stays as /)
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = expertPath;
      console.log(`[DBG][middleware] Rewriting root to ${expertPath} for expert domain`);
      return NextResponse.rewrite(url);
    }

    // Expert's own page: Allow access
    if (pathname === expertPath || pathname.startsWith(`${expertPath}/`)) {
      console.log(`[DBG][middleware] Allowing access to ${expertPath}`);
      return NextResponse.next();
    }

    // Courses belonging to this expert: Allow access
    if (pathname.startsWith('/courses/')) {
      // Let the request through - the course page will validate ownership
      console.log('[DBG][middleware] Allowing access to course page (will validate expert)');
      return NextResponse.next();
    }

    // Protected routes: Allow but let Auth0 handle authentication
    if (
      pathname.startsWith('/app/') ||
      pathname.startsWith('/srv/') ||
      pathname.startsWith('/data/app/')
    ) {
      console.log('[DBG][middleware] Allowing access to protected route');
      return await auth0.middleware(request);
    }

    // All other routes: Block access (redirect to expert page)
    // This prevents navigation to /, /experts, other expert pages, etc.
    console.log(
      `[DBG][middleware] Blocking unauthorized route ${pathname}, redirecting to ${expertPath}`
    );
    const url = request.nextUrl.clone();
    url.pathname = expertPath;
    return NextResponse.redirect(url);
  }

  // Primary domain: Allow all routes, use Auth0 for protected routes
  // Use Auth0's built-in middleware which handles:
  // - Authentication routes (/auth/login, /auth/callback, /auth/logout)
  // - Session management and rolling sessions
  return await auth0.middleware(request);
}

export const config = {
  matcher: [
    // Root path (for domain redirects)
    '/',
    // Auth routes
    '/auth/:path*',
    // Protected app routes
    '/app/:path*',
    '/srv/:path*',
    // API routes (need session for authentication)
    '/api/:path*',
    // Protected API routes
    '/data/app/:path*',
    // Expert routes (for domain isolation)
    '/experts/:path*',
    '/courses/:path*',
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files
     */
  ],
};
