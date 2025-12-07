/**
 * Calel Server-Side Authentication
 *
 * Verifies JWT tokens from Cognito on the server side.
 * Used for API route protection and session management.
 */

import { cookies } from "next/headers";
import * as jose from "jose";

// Cookie names
export const SESSION_COOKIE_NAME = "calel-session";
export const ID_TOKEN_COOKIE_NAME = "calel-id-token";

// Cognito configuration
const COGNITO_REGION = process.env.AWS_REGION || "ap-southeast-2";
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || "";
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || "";

// JWKS URI for token verification
const JWKS_URI = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}/.well-known/jwks.json`;

// Cache the JWKS
let jwksCache: ReturnType<typeof jose.createRemoteJWKSet> | null = null;

function getJWKS() {
  if (!jwksCache) {
    jwksCache = jose.createRemoteJWKSet(new URL(JWKS_URI));
  }
  return jwksCache;
}

/**
 * User type from verified token
 */
export interface AuthUser {
  sub: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
  emailVerified: boolean;
}

/**
 * Session type
 */
export interface AuthSession {
  isAuthenticated: boolean;
  user?: AuthUser;
  tokens?: {
    accessToken: string;
    idToken: string;
  };
}

/**
 * Verify a Cognito ID token
 */
export async function verifyIdToken(idToken: string): Promise<AuthUser | null> {
  console.log("[DBG][auth-server] Verifying ID token");

  try {
    const JWKS = getJWKS();

    const { payload } = await jose.jwtVerify(idToken, JWKS, {
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
      audience: COGNITO_CLIENT_ID,
    });

    console.log("[DBG][auth-server] Token verified for:", payload.email);

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      tenantId: payload["custom:tenantId"] as string | undefined,
      tenantName: payload["custom:tenantName"] as string | undefined,
      emailVerified: payload.email_verified as boolean,
    };
  } catch (error) {
    console.error("[DBG][auth-server] Token verification failed:", error);
    return null;
  }
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(accessToken: string): Promise<boolean> {
  console.log("[DBG][auth-server] Verifying access token");

  try {
    const JWKS = getJWKS();

    await jose.jwtVerify(accessToken, JWKS, {
      issuer: `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/${COGNITO_USER_POOL_ID}`,
    });

    console.log("[DBG][auth-server] Access token verified");
    return true;
  } catch (error) {
    console.error(
      "[DBG][auth-server] Access token verification failed:",
      error,
    );
    return false;
  }
}

/**
 * Get the current session from cookies
 */
export async function getSession(): Promise<AuthSession> {
  console.log("[DBG][auth-server] Getting session from cookies");

  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const idToken = cookieStore.get(ID_TOKEN_COOKIE_NAME)?.value;

    if (!accessToken || !idToken) {
      console.log("[DBG][auth-server] No session cookies found");
      return { isAuthenticated: false };
    }

    // Verify the ID token
    const user = await verifyIdToken(idToken);

    if (!user) {
      console.log("[DBG][auth-server] Invalid session tokens");
      return { isAuthenticated: false };
    }

    console.log("[DBG][auth-server] Valid session found for:", user.email);
    return {
      isAuthenticated: true,
      user,
      tokens: {
        accessToken,
        idToken,
      },
    };
  } catch (error) {
    console.error("[DBG][auth-server] Session error:", error);
    return { isAuthenticated: false };
  }
}

/**
 * Set session cookies
 */
export async function setSessionCookies(
  accessToken: string,
  idToken: string,
  refreshToken?: string,
): Promise<void> {
  console.log("[DBG][auth-server] Setting session cookies");

  const cookieStore = await cookies();

  // Access token cookie (1 hour)
  cookieStore.set(SESSION_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  // ID token cookie (1 hour)
  cookieStore.set(ID_TOKEN_COOKIE_NAME, idToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60, // 1 hour
    path: "/",
  });

  // Refresh token cookie (30 days) - optional
  if (refreshToken) {
    cookieStore.set("calel-refresh-token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
  }

  console.log("[DBG][auth-server] Session cookies set");
}

/**
 * Clear session cookies
 */
export async function clearSessionCookies(): Promise<void> {
  console.log("[DBG][auth-server] Clearing session cookies");

  const cookieStore = await cookies();

  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(ID_TOKEN_COOKIE_NAME);
  cookieStore.delete("calel-refresh-token");

  console.log("[DBG][auth-server] Session cookies cleared");
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const session = await getSession();

  if (!session.isAuthenticated || !session.user) {
    throw new Error("Authentication required");
  }

  return session.user;
}

/**
 * Require tenant - throws if user doesn't have a tenant
 */
export async function requireTenant(): Promise<
  AuthUser & { tenantId: string }
> {
  const user = await requireAuth();

  if (!user.tenantId) {
    throw new Error("Tenant required");
  }

  return user as AuthUser & { tenantId: string };
}
