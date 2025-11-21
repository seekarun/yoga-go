import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';
import {
  getExpertIdFromHostname,
  isPrimaryDomain,
  getSubdomainFromMyYogaGuru,
} from './config/domains';

/**
 * Middleware for authentication and domain-based routing
 * This middleware:
 * 1. Handles domain-based routing for expert-specific domains (e.g., kavithayoga.com)
 * 2. Automatically handles Auth0 routes (/auth/login, /auth/callback, /auth/logout)
 * 3. Manages session cookies and rolling sessions
 * 4. Redirects unauthenticated users to login for protected routes
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
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

  console.log('[DBG][middleware] Request to:', pathname, 'from:', hostname);

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

  // Handle expert domain routing (domain isolation for dedicated expert sites)
  if (isExpertDomain && expertId) {
    // Allow Next.js internals and API routes
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/data')
    ) {
      return await auth0.middleware(request);
    }

    // Allow Auth0 routes to pass through to custom route handlers
    if (pathname.startsWith('/auth')) {
      console.log('[DBG][middleware] Auth0 route detected on expert domain, bypassing');
      return NextResponse.next();
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

  // Primary domain (myyoga.guru, localhost): Allow all routes, use standard Auth0
  // Auth0 middleware will protect /app/* and /srv/* routes automatically

  // Allow Auth0 routes to pass through to custom route handlers
  if (pathname.startsWith('/auth')) {
    console.log('[DBG][middleware] Auth0 route on primary domain, bypassing to custom handler');
    return NextResponse.next();
  }

  // For protected routes, check email verification
  if (
    pathname.startsWith('/app') ||
    pathname.startsWith('/srv') ||
    pathname.startsWith('/data/app')
  ) {
    try {
      const session = await auth0.getSession(request);

      if (session?.user) {
        console.log('[DBG][middleware] Checking email verification for user:', session.user.sub);

        // Check if email is verified (skip for social logins)
        if (!session.user.email_verified) {
          // Detect if this is a social login (Twitter, Google, Facebook, etc.)
          const provider = session.user.sub.split('|')[0];
          const isSocial = provider !== 'auth0';

          if (isSocial) {
            // Social logins are auto-verified by OAuth provider
            console.log('[DBG][middleware] Social login detected, skipping email verification');
          } else {
            // Email/password signup requires email verification
            console.log(
              '[DBG][middleware] Email/password signup - email not verified, redirecting'
            );
            const url = request.nextUrl.clone();
            url.pathname = '/auth/verify-email';
            return NextResponse.redirect(url);
          }
        }

        console.log('[DBG][middleware] Email verified or social login, allowing access');
        // Note: Profile completion check is handled client-side in app layout
      }
    } catch (error) {
      console.error('[DBG][middleware] Error checking email verification:', error);
      // Continue to Auth0 middleware for authentication check
    }
  }

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
