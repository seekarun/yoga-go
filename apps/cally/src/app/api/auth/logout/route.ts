/**
 * GET /api/auth/logout
 * Clears the session cookie and redirects to home
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { COOKIE_DOMAIN, IS_PRODUCTION, BASE_URL } from "@/config/env";

export async function GET(request: NextRequest) {
  console.log("[DBG][logout] ========== LOGOUT ==========");

  // Get redirect URL from query params, default to home
  const { searchParams } = new URL(request.url);
  const returnTo = searchParams.get("returnTo") || "/";

  // Build redirect URL
  const redirectUrl = returnTo.startsWith("http")
    ? returnTo
    : `${BASE_URL}${returnTo}`;

  console.log("[DBG][logout] Redirecting to:", redirectUrl);

  // Create redirect response
  const response = NextResponse.redirect(redirectUrl);

  // Clear the session cookie
  response.cookies.set("authjs.session-token", "", {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    ...(COOKIE_DOMAIN && { domain: COOKIE_DOMAIN }),
  });

  console.log("[DBG][logout] Session cookie cleared");

  return response;
}
