import { API_BASE_URL } from "../config/api";
import type { LoginResponse } from "./auth";

/**
 * Exchange a Cognito authorization code for tokens via the backend.
 * The backend handles the token exchange with Cognito (including client secret).
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<LoginResponse> {
  console.log("[DBG][googleAuth] Exchanging code for tokens");

  const url = `${API_BASE_URL}/api/auth/mobile/google/callback`;
  console.log("[DBG][googleAuth] POST", url);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, redirectUri }),
  });

  const text = await response.text();
  console.log(
    "[DBG][googleAuth] Response status:",
    response.status,
    text.substring(0, 200),
  );

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Server error (${response.status})` };
  }
}
