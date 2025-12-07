import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Calel Middleware - Authentication and routing
 *
 * Route structure:
 * - /data/availability/* - Public (no auth)
 * - /data/booking/* - Public (no auth for create, token for view/cancel)
 * - /data/app/* - Host dashboard API (session auth required)
 * - /data/admin/* - Tenant admin API (API key auth required)
 * - /(dashboard)/* - Host dashboard pages (session auth required)
 *
 * Authentication methods:
 * - Session: Cookie-based auth for host dashboard (shares Cognito with yoga-go)
 * - API Key: Header-based auth for tenant admin operations
 */

/**
 * Check if user has a valid session by looking for the session token cookie
 * This is a simple presence check - actual validation happens in route handlers
 */
function hasSessionCookie(request: NextRequest): boolean {
  // Check for NextAuth session token (if using NextAuth)
  const nextAuthToken = request.cookies.get("authjs.session-token")?.value;
  // Check for Cognito session cookie (if sharing with yoga-go)
  const cognitoToken = request.cookies.get("calel-session")?.value;
  return !!(nextAuthToken || cognitoToken);
}

/**
 * Check if request has API key in header
 */
function hasApiKey(request: NextRequest): boolean {
  const apiKey =
    request.headers.get("x-api-key") || request.headers.get("authorization");
  return !!apiKey;
}

/**
 * Extract API key from request headers
 */
export function getApiKey(request: NextRequest): string | null {
  // Check x-api-key header first
  const xApiKey = request.headers.get("x-api-key");
  if (xApiKey) {
    return xApiKey;
  }

  // Check Authorization header (Bearer token format)
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  return null;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  console.log("[DBG][middleware] Request to:", pathname, "from:", hostname);

  // Public routes - no auth required
  // Availability and booking endpoints are public
  if (
    pathname.startsWith("/data/availability") ||
    pathname.startsWith("/data/booking") ||
    pathname === "/api/health"
  ) {
    console.log("[DBG][middleware] Public route, allowing access");
    return NextResponse.next();
  }

  // Admin API routes - require API key
  if (pathname.startsWith("/data/admin")) {
    if (!hasApiKey(request)) {
      console.log("[DBG][middleware] Admin route without API key");
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "API key required" },
        },
        { status: 401 },
      );
    }
    console.log("[DBG][middleware] Admin route with API key, allowing access");
    return NextResponse.next();
  }

  // Host dashboard API routes - require session
  if (pathname.startsWith("/data/app")) {
    if (!hasSessionCookie(request)) {
      console.log("[DBG][middleware] Host API without session");
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "Authentication required" },
        },
        { status: 401 },
      );
    }
    console.log("[DBG][middleware] Host API with session, allowing access");
    return NextResponse.next();
  }

  // Host dashboard pages - require session
  if (pathname.startsWith("/dashboard") || pathname.startsWith("/app")) {
    if (!hasSessionCookie(request)) {
      console.log(
        "[DBG][middleware] Dashboard without session, redirecting to login",
      );
      const loginUrl = new URL("/auth/signin", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    console.log("[DBG][middleware] Dashboard with session, allowing access");
    return NextResponse.next();
  }

  // Auth routes - allow through
  if (pathname.startsWith("/auth")) {
    console.log("[DBG][middleware] Auth route, allowing access");
    return NextResponse.next();
  }

  // All other routes - allow through (static pages, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: [
    // API routes
    "/data/:path*",
    "/api/:path*",
    // Dashboard routes
    "/dashboard/:path*",
    "/app/:path*",
    // Auth routes
    "/auth/:path*",
  ],
};
