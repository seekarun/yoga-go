/**
 * Google OAuth Redirect Endpoint
 * Redirects to Cognito Hosted UI with Google as the identity provider
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cognitoConfig } from "@/lib/cognito";
import { BASE_URL } from "@/config/env";

export async function GET(request: NextRequest) {
  console.log("[DBG][auth/google] Initiating Google OAuth flow");

  const searchParams = request.nextUrl.searchParams;
  const callbackUrl = searchParams.get("callbackUrl") || "/srv";
  const visitorTenantId = searchParams.get("visitorTenantId");

  // Build state as base64-encoded JSON to carry visitor context
  const stateObj: Record<string, string> = { callbackUrl };
  if (visitorTenantId) {
    stateObj.visitorTenantId = visitorTenantId;
  }
  const state = Buffer.from(JSON.stringify(stateObj)).toString("base64");

  // Cognito Hosted UI domain
  const domain = cognitoConfig.domain;
  const redirectUri = `${BASE_URL}/api/auth/google/callback`;

  // Build the OAuth URL with Google as identity provider
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: "code",
    scope: "email openid profile",
    redirect_uri: redirectUri,
    identity_provider: "Google",
    state,
    prompt: "select_account", // Force Google to show account selection
  });

  const googleOAuthUrl = `https://${domain}/oauth2/authorize?${params.toString()}`;

  console.log("[DBG][auth/google] Config:", {
    clientId: cognitoConfig.clientId,
    domain,
    redirectUri,
    callbackUrl,
  });
  console.log("[DBG][auth/google] Redirecting to:", googleOAuthUrl);

  return NextResponse.redirect(googleOAuthUrl);
}
