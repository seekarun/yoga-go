/**
 * Calel Authentication Utilities
 *
 * Handles both API key authentication (for tenant admin operations)
 * and session authentication (for host dashboard).
 */

import { cookies, headers } from "next/headers";
import { getTenantByApiKey, getHostByEmail } from "./repositories";
import type { CalendarTenant, CalendarHost } from "@yoga-go/calel-types";

// Context types for authenticated requests
export interface TenantContext {
  tenant: CalendarTenant;
}

export interface HostContext {
  host: CalendarHost;
  tenant: CalendarTenant;
}

/**
 * Authenticate request using API key
 * Used for tenant admin API (/data/admin/*)
 */
export async function authenticateApiKey(): Promise<TenantContext | null> {
  console.log("[DBG][auth] Authenticating with API key");

  const headersList = await headers();
  let apiKey = headersList.get("x-api-key");

  if (!apiKey) {
    const authHeader = headersList.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      apiKey = authHeader.slice(7);
    }
  }

  if (!apiKey) {
    console.log("[DBG][auth] No API key found in headers");
    return null;
  }

  const tenant = await getTenantByApiKey(apiKey);
  if (!tenant) {
    console.log("[DBG][auth] Invalid API key");
    return null;
  }

  if (tenant.status !== "active") {
    console.log("[DBG][auth] Tenant is not active:", tenant.status);
    return null;
  }

  console.log("[DBG][auth] Authenticated tenant:", tenant.id);
  return { tenant };
}

/**
 * Get session from cookies
 * Used for host dashboard (/data/app/*)
 *
 * Note: This is a simplified implementation. In production, you would:
 * 1. Verify JWT token signature
 * 2. Check token expiration
 * 3. Validate claims
 */
export async function getSessionFromCookies(): Promise<{
  email: string;
} | null> {
  console.log("[DBG][auth] Getting session from cookies");

  const cookieStore = await cookies();

  // Try NextAuth session token
  const sessionToken = cookieStore.get("authjs.session-token")?.value;
  if (sessionToken) {
    // In production, decode and verify the JWT token
    // For now, we'll just check if it exists
    // The actual user info should come from the token
    console.log("[DBG][auth] Found NextAuth session token");
    // TODO: Decode JWT and extract email
    return null; // Placeholder - need JWT decoding
  }

  // Try Calel session cookie
  const calelSession = cookieStore.get("calel-session")?.value;
  if (calelSession) {
    try {
      // Parse session cookie (assuming it's a JSON with email)
      const session = JSON.parse(calelSession);
      if (session.email) {
        console.log("[DBG][auth] Found Calel session for:", session.email);
        return { email: session.email };
      }
    } catch {
      console.log("[DBG][auth] Failed to parse Calel session cookie");
    }
  }

  console.log("[DBG][auth] No valid session found");
  return null;
}

/**
 * Authenticate host from session
 * Used for host dashboard API (/data/app/*)
 */
export async function authenticateHost(): Promise<HostContext | null> {
  console.log("[DBG][auth] Authenticating host");

  const session = await getSessionFromCookies();
  if (!session) {
    return null;
  }

  const host = await getHostByEmail(session.email);
  if (!host) {
    console.log("[DBG][auth] No host found for email:", session.email);
    return null;
  }

  if (host.status !== "active") {
    console.log("[DBG][auth] Host is not active:", host.status);
    return null;
  }

  // Get tenant for context
  const { getTenantById } = await import("./repositories");
  const tenant = await getTenantById(host.tenantId);
  if (!tenant || tenant.status !== "active") {
    console.log("[DBG][auth] Tenant not found or not active");
    return null;
  }

  console.log("[DBG][auth] Authenticated host:", host.id, "tenant:", tenant.id);
  return { host, tenant };
}

/**
 * API response helpers
 */
export function unauthorizedResponse(message = "Unauthorized") {
  return Response.json(
    { success: false, error: { code: "UNAUTHORIZED", message } },
    { status: 401 },
  );
}

export function forbiddenResponse(message = "Forbidden") {
  return Response.json(
    { success: false, error: { code: "FORBIDDEN", message } },
    { status: 403 },
  );
}

export function badRequestResponse(
  message: string,
  details?: Record<string, string>,
) {
  return Response.json(
    { success: false, error: { code: "BAD_REQUEST", message, details } },
    { status: 400 },
  );
}

export function notFoundResponse(message = "Not found") {
  return Response.json(
    { success: false, error: { code: "NOT_FOUND", message } },
    { status: 404 },
  );
}

export function successResponse<T>(data: T) {
  return Response.json({ success: true, data });
}

export function errorResponse(code: string, message: string, status = 500) {
  return Response.json(
    { success: false, error: { code, message } },
    { status },
  );
}
