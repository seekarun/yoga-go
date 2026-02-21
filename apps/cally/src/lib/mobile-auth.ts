/**
 * Mobile Auth Helper
 * Extracts cognitoSub from Authorization: Bearer <token> header
 * Used by API routes that need to support both web (cookie) and mobile (Bearer) auth
 */
import { getAccessTokenVerifier } from "./cognito";

export interface MobileSession {
  cognitoSub: string;
}

export interface MobileAuthResult {
  session: MobileSession | null;
  tokenExpired: boolean;
}

/**
 * Extract and verify a mobile session from the request's Authorization header
 * Returns { cognitoSub } on success, or null if no valid Bearer token
 */
export async function getMobileSession(
  request: Request,
): Promise<MobileSession | null> {
  const result = await getMobileAuthResult(request);
  return result.session;
}

/**
 * Like getMobileSession but also reports whether the token was present but expired.
 * Use this in routes that need to return a distinct "Token expired" error.
 */
export async function getMobileAuthResult(
  request: Request,
): Promise<MobileAuthResult> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { session: null, tokenExpired: false };
  }

  const token = authHeader.substring(7);
  const verifier = getAccessTokenVerifier();

  if (!verifier) {
    console.error("[DBG][mobile-auth] Access token verifier not available");
    return { session: null, tokenExpired: false };
  }

  try {
    const payload = await verifier.verify(token);
    return { session: { cognitoSub: payload.sub }, tokenExpired: false };
  } catch (error) {
    const isExpired =
      error instanceof Error && error.message.includes("expired");
    console.error("[DBG][mobile-auth] Token verification failed:", error);
    return { session: null, tokenExpired: isExpired };
  }
}
