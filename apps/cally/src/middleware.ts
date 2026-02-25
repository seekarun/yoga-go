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
    pathname.startsWith("/embed/") ||
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
 * Middleware for CallyGo app
 * 1. Custom domain rewriting: mymusic.guru/signup → /{tenantId}/signup
 * 2. Authentication for protected routes
 */
/**
 * Add CORS headers to a response for public tenant API routes
 */
function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get("host") || "";

  // --- CORS for public tenant API routes (used by embed widgets) ---
  if (pathname.startsWith("/api/data/tenants/")) {
    if (request.method === "OPTIONS") {
      const response = new NextResponse(null, { status: 204 });
      return addCorsHeaders(response);
    }
  }

  // --- Block /supa admin routes on non-localhost ---
  const host = hostname.split(":")[0];
  const isLocalhost = host === "localhost" || host === "127.0.0.1";

  if (
    !isLocalhost &&
    (pathname.startsWith("/supa") || pathname.startsWith("/api/supa"))
  ) {
    if (pathname.startsWith("/api/supa")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // --- Custom domain rewriting ---
  if (isCustomDomain(hostname) && !isSystemPath(pathname)) {
    // Strip www. prefix so www.mymusic.guru resolves the same as mymusic.guru
    const domain = hostname.split(":")[0].replace(/^www\./, "");
    const tenantId = await lookupTenantByDomain(domain);

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
        domain,
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

  // Allow public API routes (add CORS for tenant API routes used by embeds)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/srv")) {
    const response = NextResponse.next();
    if (pathname.startsWith("/api/data/tenants/")) {
      return addCorsHeaders(response);
    }
    return response;
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
