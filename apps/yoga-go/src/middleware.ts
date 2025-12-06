import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from './auth';
import {
  getExpertIdFromHostname,
  isPrimaryDomain,
  getSubdomainFromMyYogaGuru,
  resolveDomainToTenant,
} from './config/domains';

/**
 * Middleware for authentication and domain-based routing
 * This middleware:
 * 1. Handles domain-based routing for expert-specific domains (e.g., kavithayoga.com)
 * 2. Uses NextAuth for session management
 * 3. Redirects unauthenticated users to login for protected routes
 *
 * Domain routing:
 * - myyoga.guru / localhost -> serves all routes (full platform)
 * - kavithayoga.com -> ONLY /experts/kavitha content (isolated)
 * - deepakyoga.com -> ONLY /experts/deepak content (isolated)
 *
 * Protected routes:
 * - /app/* - User dashboard (learners AND experts can access)
 * - /srv/* - Expert portal (only experts can access - checked in pages)
 * - /data/app/* - API routes for authenticated users
 */
export default auth(async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  // @ts-expect-error - auth adds this property
  const session = request.auth;

  console.log('[DBG][middleware] Request to:', pathname, 'from:', hostname);

  // Check for pending_logout cookie (set during logout flow)
  // If found, clear it and redirect to NextAuth signout to clear any remaining session
  const pendingLogout = request.cookies.get('pending_logout');
  if (pendingLogout && pathname === '/') {
    console.log('[DBG][middleware] ========== PENDING LOGOUT DETECTED ==========');
    console.log('[DBG][middleware] Clearing pending_logout and redirecting to signout');

    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    // Redirect to NextAuth signout
    const signOutUrl = new URL('/api/auth/signout', baseUrl);
    signOutUrl.searchParams.set('callbackUrl', baseUrl);

    const response = NextResponse.redirect(signOutUrl.toString());

    // Clear the pending_logout cookie
    response.cookies.set('pending_logout', '', {
      path: '/',
      maxAge: 0,
    });

    return response;
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

  // Resolve tenant context (for multi-tenancy)
  // Try dynamic lookup if not found in static config
  let tenantId: string | null = expertId;
  if (!tenantId && !isPrimary) {
    const tenantResult = await resolveDomainToTenant(hostname);
    if (tenantResult) {
      tenantId = tenantResult.tenantId;
      expertId = tenantResult.expertId;
      isExpertDomain = true;
    }
  }

  console.log(
    '[DBG][middleware] Expert domain:',
    isExpertDomain,
    'Expert ID:',
    expertId,
    'Tenant ID:',
    tenantId,
    'Is primary:',
    isPrimary,
    'MyYoga.Guru subdomain:',
    myYogaGuruSubdomain,
    'Session:',
    session ? 'exists' : 'null'
  );

  // Helper to add tenant headers to response
  const addTenantHeaders = (response: NextResponse): NextResponse => {
    if (tenantId) {
      response.headers.set('x-tenant-id', tenantId);
    }
    if (expertId) {
      response.headers.set('x-expert-id', expertId);
    }
    return response;
  };

  // Handle expert domain routing (domain isolation for dedicated expert sites)
  if (isExpertDomain && expertId) {
    // Allow Next.js internals
    if (pathname.startsWith('/_next')) {
      return addTenantHeaders(NextResponse.next());
    }

    // Allow API routes but check auth for protected ones
    if (pathname.startsWith('/api') || pathname.startsWith('/data')) {
      // Protected API routes require authentication
      if (pathname.startsWith('/data/app/')) {
        if (!session) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }
      return addTenantHeaders(NextResponse.next());
    }

    // Allow Auth routes to pass through to custom route handlers
    if (pathname.startsWith('/auth')) {
      console.log('[DBG][middleware] Auth route detected on expert domain, bypassing');
      return addTenantHeaders(NextResponse.next());
    }

    // Allow static assets
    if (pathname.startsWith('/public') || pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      return addTenantHeaders(NextResponse.next());
    }

    const expertPath = `/experts/${expertId}`;

    // Root path: Rewrite to expert page (URL stays as /)
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = expertPath;
      console.log(`[DBG][middleware] Rewriting root to ${expertPath} for expert domain`);
      return addTenantHeaders(NextResponse.rewrite(url));
    }

    // Expert's own page: Allow access
    if (pathname === expertPath || pathname.startsWith(`${expertPath}/`)) {
      console.log(`[DBG][middleware] Allowing access to ${expertPath}`);
      return addTenantHeaders(NextResponse.next());
    }

    // Courses belonging to this expert: Allow access
    if (pathname.startsWith('/courses/')) {
      console.log('[DBG][middleware] Allowing access to course page (will validate expert)');
      return addTenantHeaders(NextResponse.next());
    }

    // Protected routes: Check authentication
    if (
      pathname.startsWith('/app/') ||
      pathname.startsWith('/srv/') ||
      pathname.startsWith('/data/app/')
    ) {
      if (!session) {
        console.log('[DBG][middleware] No session, redirecting to signin');
        const loginUrl = new URL('/auth/signin', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      console.log('[DBG][middleware] Allowing access to protected route');
      return addTenantHeaders(NextResponse.next());
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

  // Primary domain (myyoga.guru, localhost): Allow all routes

  // Allow Auth routes to pass through to custom route handlers
  if (pathname.startsWith('/auth')) {
    console.log('[DBG][middleware] Auth route on primary domain, bypassing to custom handler');
    return addTenantHeaders(NextResponse.next());
  }

  // Protected routes: Check authentication
  if (
    pathname.startsWith('/app/') ||
    pathname.startsWith('/srv/') ||
    pathname.startsWith('/data/app/')
  ) {
    if (!session) {
      console.log('[DBG][middleware] No session, redirecting to signin');
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return addTenantHeaders(NextResponse.next());
});

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
