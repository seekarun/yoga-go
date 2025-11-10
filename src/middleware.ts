import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from './lib/auth0';
import { Auth0Client } from '@auth0/nextjs-auth0/server';
import {
  getExpertIdFromHostname,
  isPrimaryDomain,
  isAdminDomain,
  getSubdomainFromMyYogaGuru,
} from './config/domains';

// Helper to create subdomain-specific Auth0 client
const getDomain = () => {
  const issuerUrl = process.env.AUTH0_ISSUER_BASE_URL || 'https://placeholder.auth0.com';
  return issuerUrl.replace('https://', '');
};

function createSubdomainAuth0Client(hostname: string): Auth0Client {
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  const dynamicBaseUrl = `${protocol}://${hostname}`;

  return new Auth0Client({
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
}

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

    // Allow Next.js internals and API routes - use subdomain-specific auth client
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/data')
    ) {
      const subdomainAuth = createSubdomainAuth0Client(hostname);
      return await subdomainAuth.middleware(request);
    }

    // IMPORTANT: Allow Auth0 routes to pass through to custom route handlers
    // Don't use auth0.middleware for /auth routes - let custom handlers handle subdomain logic
    if (pathname.startsWith('/auth')) {
      console.log(
        '[DBG][middleware] Auth0 route detected, bypassing middleware to use custom handlers'
      );
      return NextResponse.next();
    }

    // Allow static assets
    if (pathname.startsWith('/public') || pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js)$/)) {
      return NextResponse.next();
    }

    // Allow /experts/* routes (for viewing public pages from admin dashboard)
    if (pathname.startsWith('/experts/')) {
      console.log('[DBG][middleware] Allowing /experts route on admin domain');
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

    // /srv routes: Allow through Auth0 middleware with subdomain-specific client
    const subdomainAuth = createSubdomainAuth0Client(hostname);
    return await subdomainAuth.middleware(request);
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
    // Allow Next.js internals and API routes - use subdomain-specific auth client
    if (
      pathname.startsWith('/_next') ||
      pathname.startsWith('/api') ||
      pathname.startsWith('/data')
    ) {
      const subdomainAuth = createSubdomainAuth0Client(hostname);
      return await subdomainAuth.middleware(request);
    }

    // IMPORTANT: Allow Auth0 routes to pass through to custom route handlers
    // Don't use auth0.middleware for /auth routes - let custom handlers handle subdomain logic
    if (pathname.startsWith('/auth')) {
      console.log(
        '[DBG][middleware] Auth0 route detected on expert domain, bypassing to custom handlers'
      );
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
      // Let the request through - the course page will validate ownership
      console.log('[DBG][middleware] Allowing access to course page (will validate expert)');
      return NextResponse.next();
    }

    // Protected routes: Allow but let Auth0 handle authentication with subdomain-specific client
    if (
      pathname.startsWith('/app/') ||
      pathname.startsWith('/srv/') ||
      pathname.startsWith('/data/app/')
    ) {
      console.log('[DBG][middleware] Allowing access to protected route');
      const subdomainAuth = createSubdomainAuth0Client(hostname);
      return await subdomainAuth.middleware(request);
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

  // Primary domain: Allow all routes, use subdomain-specific Auth0 for protected routes
  // This ensures sessions work correctly even on main domain (localhost:3111)
  const subdomainAuth = createSubdomainAuth0Client(hostname);
  return await subdomainAuth.middleware(request);
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
    // Protected API routes
    '/data/app/:path*',
    // Expert routes (for domain isolation)
    '/experts/:path*',
    '/courses/:path*',
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
