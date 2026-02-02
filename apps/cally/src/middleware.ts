import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Check if user has a valid session by looking for the session token cookie
 */
function hasSessionCookie(request: NextRequest): boolean {
  const sessionToken = request.cookies.get("authjs.session-token")?.value;
  return !!sessionToken;
}

/**
 * Simplified middleware for Cally app
 * Handles authentication for protected routes
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = hasSessionCookie(request);

  console.log(
    "[DBG][middleware] Request to:",
    pathname,
    "hasSession:",
    hasSession,
  );

  // Allow Next.js internals and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/)
  ) {
    return NextResponse.next();
  }

  // Allow auth routes
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Allow public API routes
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/srv")) {
    return NextResponse.next();
  }

  // Protected routes: /srv/* and /data/app/*
  if (
    pathname === "/srv" ||
    pathname.startsWith("/srv/") ||
    pathname.startsWith("/data/app/")
  ) {
    if (!hasSession) {
      console.log("[DBG][middleware] No session, redirecting to signin");
      const loginUrl = new URL("/auth/signin", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/srv/:path*", "/api/:path*", "/data/:path*"],
};
