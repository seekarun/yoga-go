import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  getExpertIdFromHostname,
  isPrimaryDomain,
  getSubdomainFromMyYogaGuru,
  resolveDomainToTenant,
  isLearnerDomain,
  isPreviewDomain,
} from './config/domains';

/**
 * Check if user has a valid session by looking for the session token cookie
 * This is a simple check - actual session validation happens in route handlers
 */
function hasSessionCookie(request: NextRequest): boolean {
  const sessionToken = request.cookies.get('authjs.session-token')?.value;
  return !!sessionToken;
}

/**
 * Middleware for authentication and domain-based routing
 * This middleware:
 * 1. Handles domain-based routing for expert-specific domains (e.g., kavithayoga.com)
 * 2. Checks for session cookie presence (not full validation - that's in route handlers)
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
 *
 * Note: We don't use NextAuth's auth() wrapper here because it doesn't work
 * reliably on Vercel Edge Runtime. Instead, we check for cookie presence.
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const hasSession = hasSessionCookie(request);

  console.log('[DBG][middleware] Request to:', pathname, 'from:', hostname);

  // Check for post-logout-redirect cookie (set during Cognito logout flow)
  // This handles redirecting to the intended destination after Cognito logout
  // Cognito only accepts base URLs in logout_uri, so we store the final path in a cookie
  const postLogoutRedirect = request.cookies.get('post-logout-redirect');
  if (postLogoutRedirect && pathname === '/') {
    const redirectPath = postLogoutRedirect.value;
    console.log('[DBG][middleware] ========== POST LOGOUT REDIRECT ==========');
    console.log('[DBG][middleware] Redirecting to:', redirectPath);

    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;
    const redirectUrl = new URL(redirectPath, baseUrl);

    const response = NextResponse.redirect(redirectUrl.toString());

    // Clear the cookie - must match domain used when setting
    const isProduction = !hostname.includes('localhost');
    response.cookies.set('post-logout-redirect', '', {
      path: '/',
      maxAge: 0,
      ...(isProduction && { domain: '.myyoga.guru' }),
    });

    return response;
  }

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

  // Check domain type for routing decisions
  const isLearner = isLearnerDomain(hostname);
  const isPreview = isPreviewDomain(hostname);

  // Handle preview domain (preview.myyoga.guru/<expertId>)
  // This allows logged-in experts to preview their draft landing page
  if (isPreview) {
    console.log('[DBG][middleware] Preview domain detected');

    // Allow Next.js internals and API routes
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/data')
    ) {
      return NextResponse.next();
    }

    // Allow static assets
    if (pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)) {
      return NextResponse.next();
    }

    // Extract expertId from path: /<expertId> or /experts/<expertId>
    const pathMatch = pathname.match(/^\/?(?:experts\/)?([a-zA-Z0-9_-]+)/);
    const previewExpertId = pathMatch?.[1];

    // If no expertId or it's a reserved path, redirect to main site
    if (
      !previewExpertId ||
      ['experts', 'auth', 'app', 'srv', 'data', 'api'].includes(previewExpertId)
    ) {
      console.log('[DBG][middleware] Preview: No valid expertId, redirecting to main site');
      const mainUrl = new URL('/', 'https://myyoga.guru');
      return NextResponse.redirect(mainUrl);
    }

    // Require authentication
    if (!hasSession) {
      console.log('[DBG][middleware] Preview: Not authenticated, redirecting to login');
      const loginUrl = new URL('/auth/signin', 'https://myyoga.guru');
      loginUrl.searchParams.set('callbackUrl', `https://preview.myyoga.guru/${previewExpertId}`);
      return NextResponse.redirect(loginUrl);
    }

    console.log(
      '[DBG][middleware] Preview: Rewriting to expert page with draft mode',
      previewExpertId
    );

    // Rewrite to expert page with preview headers
    const url = request.nextUrl.clone();
    url.pathname = `/experts/${previewExpertId}`;
    const response = NextResponse.rewrite(url);
    response.headers.set('x-preview-mode', 'draft');
    response.headers.set('x-expert-id', previewExpertId);
    return response;
  }

  // Note: myyoga.guru now shows the waitlist/coming soon page at /
  // Expert platform is accessible at /srv directly

  // Check if this is a dynamic myyoga.guru subdomain (e.g., deepak.myyoga.guru)
  const myYogaGuruSubdomain = getSubdomainFromMyYogaGuru(hostname);
  let expertId: string | null = null;
  let isExpertDomain = false;
  let tenantId: string | null = null;

  const isPrimary = isPrimaryDomain(hostname) || isLearner;

  // Track landing page publish status
  let isLandingPagePublished = true; // Default to published for backward compat

  // Resolve tenant context for all non-primary domains
  // This now validates myyoga.guru subdomains against the database
  if (!isPrimary) {
    const tenantResult = await resolveDomainToTenant(hostname);
    if (tenantResult) {
      tenantId = tenantResult.tenantId;
      expertId = tenantResult.expertId;
      isExpertDomain = true;
      isLandingPagePublished = tenantResult.isLandingPagePublished;
    } else if (myYogaGuruSubdomain) {
      // This is a myyoga.guru subdomain that doesn't exist in the database
      // Redirect to the main site
      console.log(
        '[DBG][middleware] Invalid subdomain, redirecting to main site:',
        myYogaGuruSubdomain
      );
      const mainUrl = new URL('/', 'https://myyoga.guru');
      return NextResponse.redirect(mainUrl);
    }
    // For custom domains that don't resolve, fall through to check static config
    if (!expertId) {
      expertId = getExpertIdFromHostname(hostname);
      isExpertDomain = expertId !== null;
      tenantId = expertId;
      // Static config domains are always published
      isLandingPagePublished = true;
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
    'Is learner:',
    isLearner,
    'MyYoga.Guru subdomain:',
    myYogaGuruSubdomain,
    'Has session cookie:',
    hasSession,
    'Landing page published:',
    isLandingPagePublished
  );

  // Helper to add tenant headers to response
  const addTenantHeaders = (response: NextResponse, isPreviewMode = false): NextResponse => {
    if (tenantId) {
      response.headers.set('x-tenant-id', tenantId);
    }
    if (expertId) {
      response.headers.set('x-expert-id', expertId);
    }
    // Set preview mode header for unpublished pages viewed by logged-in users
    // The page will verify if the user is the expert owner
    if (isPreviewMode) {
      response.headers.set('x-preview-mode', 'true');
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
        if (!hasSession) {
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

    // Handle unpublished landing pages
    // If page is NOT published:
    // - Visitors (not logged in) → redirect to myyoga.guru
    // - Logged in users → allow access in preview mode (page verifies ownership)
    if (!isLandingPagePublished) {
      console.log(
        '[DBG][middleware] Landing page NOT published for expert:',
        expertId,
        'hasSession:',
        hasSession
      );

      // For public landing page routes (/ or /experts/{expertId}), check publish status
      if (pathname === '/' || pathname === expertPath || pathname.startsWith(`${expertPath}/`)) {
        if (!hasSession) {
          // Visitor trying to access unpublished page → redirect to main site
          console.log('[DBG][middleware] Redirecting visitor from unpublished page to myyoga.guru');
          const mainUrl = new URL('/', 'https://myyoga.guru');
          return NextResponse.redirect(mainUrl);
        }
        // User is logged in - allow access in preview mode
        // The page will verify if the user is the expert owner
        console.log('[DBG][middleware] Allowing logged-in user preview access');

        if (pathname === '/') {
          const url = request.nextUrl.clone();
          url.pathname = expertPath;
          return addTenantHeaders(NextResponse.rewrite(url), true);
        }
        return addTenantHeaders(NextResponse.next(), true);
      }
    }

    // Root path: Rewrite to expert page (URL stays as /)
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = expertPath;
      console.log(`[DBG][middleware] Rewriting root to ${expertPath} for expert domain`);
      return addTenantHeaders(NextResponse.rewrite(url));
    }

    // Expert's own page: Redirect to root (keep URL clean)
    // /experts/aaa on aaa.myyoga.guru should redirect to /
    if (pathname === expertPath) {
      console.log(`[DBG][middleware] Redirecting ${expertPath} to / for clean URL`);
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
    // Allow subpaths of expert page (e.g., /experts/aaa/something)
    if (pathname.startsWith(`${expertPath}/`)) {
      console.log(`[DBG][middleware] Allowing access to ${pathname}`);
      return addTenantHeaders(NextResponse.next());
    }

    // Courses paths: Rewrite to /experts/{expertId}/courses/* for this expert
    if (pathname.startsWith('/courses/') || pathname === '/courses') {
      const rewritePath = `/experts/${expertId}${pathname}`;
      console.log(`[DBG][middleware] Rewriting course path to ${rewritePath}`);
      const url = request.nextUrl.clone();
      url.pathname = rewritePath;
      return addTenantHeaders(NextResponse.rewrite(url));
    }

    // Blog paths: Rewrite to /experts/{expertId}/blog/* for this expert
    if (pathname.startsWith('/blog')) {
      const rewritePath = `/experts/${expertId}${pathname}`;
      console.log(`[DBG][middleware] Rewriting blog path to ${rewritePath}`);
      const url = request.nextUrl.clone();
      url.pathname = rewritePath;
      return addTenantHeaders(NextResponse.rewrite(url));
    }

    // Survey paths: Rewrite to /experts/{expertId}/survey/* for this expert
    if (pathname.startsWith('/survey')) {
      const rewritePath = `/experts/${expertId}${pathname}`;
      console.log(`[DBG][middleware] Rewriting survey path to ${rewritePath}`);
      const url = request.nextUrl.clone();
      url.pathname = rewritePath;
      return addTenantHeaders(NextResponse.rewrite(url));
    }

    // Webinars paths: Rewrite to /experts/{expertId}/webinars/* for this expert
    if (pathname.startsWith('/webinars') || pathname === '/webinars') {
      const rewritePath = `/experts/${expertId}${pathname}`;
      console.log(`[DBG][middleware] Rewriting webinars path to ${rewritePath}`);
      const url = request.nextUrl.clone();
      url.pathname = rewritePath;
      return addTenantHeaders(NextResponse.rewrite(url));
    }

    // Protected routes: Check authentication
    if (
      pathname === '/app' ||
      pathname.startsWith('/app/') ||
      pathname === '/srv' ||
      pathname.startsWith('/srv/') ||
      pathname.startsWith('/data/app/')
    ) {
      if (!hasSession) {
        console.log('[DBG][middleware] No session cookie, redirecting to signin');
        const loginUrl = new URL('/auth/signin', request.url);
        loginUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(loginUrl);
      }
      console.log('[DBG][middleware] Allowing access to protected route');
      return addTenantHeaders(NextResponse.next());
    }

    // All other routes: Block access (redirect to root)
    // This prevents navigation to /experts, other expert pages, etc.
    console.log(`[DBG][middleware] Blocking unauthorized route ${pathname}, redirecting to /`);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // Primary domain (myyoga.guru, localhost): Allow all routes

  // Allow Auth routes to pass through to custom route handlers
  if (pathname.startsWith('/auth')) {
    console.log('[DBG][middleware] Auth route on primary domain, bypassing to custom handler');
    return addTenantHeaders(NextResponse.next());
  }

  // Protected routes: Check authentication
  // Note: /data/app/* routes handle their own auth via getSessionFromCookies()
  // because the middleware's auth() wrapper doesn't work reliably on Vercel for fetch requests
  if (pathname.startsWith('/data/app/')) {
    console.log('[DBG][middleware] API route - letting through for route handler auth');
    return addTenantHeaders(NextResponse.next());
  } else if (
    pathname === '/app' ||
    pathname.startsWith('/app/') ||
    pathname === '/srv' ||
    pathname.startsWith('/srv/')
  ) {
    // Page routes: Redirect to login
    if (!hasSession) {
      console.log('[DBG][middleware] No session cookie, redirecting to signin');
      const loginUrl = new URL('/auth/signin', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return addTenantHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Root path (for domain redirects)
    '/',
    // Single-segment paths for preview domain (e.g., /admin, /kavitha)
    '/:path',
    // Auth routes
    '/auth/:path*',
    // Protected app routes
    '/app/:path*',
    '/srv/:path*',
    // API routes (need session for authentication)
    '/api/:path*',
    // All data API routes (including /data/experts for preview domain)
    '/data/:path*',
    // Expert routes (for domain isolation)
    '/experts/:path*',
    '/courses/:path*',
    // Blog, survey, and webinars routes (for subdomain rewriting)
    '/blog/:path*',
    '/survey/:path*',
    '/webinars/:path*',
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - public files
     */
  ],
};
