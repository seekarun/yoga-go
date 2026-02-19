/**
 * Mobile Auth Helper
 * Extracts cognitoSub from Authorization: Bearer <token> header
 * Used by API routes that need to support both web (cookie) and mobile (Bearer) auth
 */
import { getAccessTokenVerifier } from "./cognito";

export interface MobileSession {
  cognitoSub: string;
}

/**
 * Extract and verify a mobile session from the request's Authorization header
 * Returns { cognitoSub } on success, or null if no valid Bearer token
 */
export async function getMobileSession(
  request: Request,
): Promise<MobileSession | null> {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const verifier = getAccessTokenVerifier();

  if (!verifier) {
    console.error("[DBG][mobile-auth] Access token verifier not available");
    return null;
  }

  try {
    const payload = await verifier.verify(token);
    return { cognitoSub: payload.sub };
  } catch (error) {
    console.error("[DBG][mobile-auth] Token verification failed:", error);
    return null;
  }
}
