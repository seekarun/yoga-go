import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { lookupTenantByDomain } from "@/lib/edge-domain-lookup";

const APP_DOMAIN = process.env.NEXT_PUBLIC_DOMAIN || "cally.app";

/**
 * Check if the hostname is a custom domain (not the app domain, localhost, or Vercel preview)
 */
function isCustomDomain(hostname: string): boolean {
  // Strip port for localhost checks
  const host = hostname.split(":")[0];
  if (host === "localhost" || host === "127.0.0.1") return false;
  if (host === APP_DOMAIN || host.endsWith(`.${APP_DOMAIN}`)) return false;
  if (host.endsWith(".vercel.app")) return false;
  return true;
}

/**
 * Paths that should never be rewritten on custom domains
 * (they work the same regardless of domain)
 */
function isSystemPath(pathname: string): boolean {
  return (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/auth/") ||
    pathname.startsWith("/srv/") ||
    pathname.startsWith("/_next/") ||
    /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/.test(pathname)
  );
}

/**
 * Check if user has a valid session by looking for the session token cookie
 */
function hasSessionCookie(request: NextRequest): boolean {
  const sessionToken = request.cookies.get("authjs.session-token")?.value;
  return !!sessionToken;
}

/**
 * Middleware for Cally app
 * 1. Custom domain rewriting: mymusic.guru/signup → /{tenantId}/signup
 * 2. Authentication for protected routes
 */
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // --- Custom domain rewriting ---
  if (isCustomDomain(hostname) && !isSystemPath(pathname)) {
    const tenantId = await lookupTenantByDomain(hostname.split(":")[0]);

    if (tenantId) {
      // Only rewrite if the path doesn't already start with the tenantId
      if (!pathname.startsWith(`/${tenantId}`)) {
        const rewriteUrl = request.nextUrl.clone();
        rewriteUrl.pathname = `/${tenantId}${pathname}`;
        console.log(
          "[DBG][middleware] Custom domain rewrite:",
          hostname,
          pathname,
          "→",
          rewriteUrl.pathname,
        );
        return NextResponse.rewrite(rewriteUrl);
      }
    } else {
      console.log(
        "[DBG][middleware] No tenant found for custom domain:",
        hostname,
      );
    }
  }

  // --- Auth logic (unchanged) ---
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
    /\.(ico|png|jpg|jpeg|svg|css|js|woff|woff2)$/.test(pathname)
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
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
