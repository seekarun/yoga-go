/**
 * Zoom API client for CallyGo
 *
 * Provides functions to interact with Zoom:
 * - OAuth token management (exchange, refresh, revoke)
 * - User info retrieval
 * - Meeting creation
 *
 * Uses fetch() directly — no SDK dependency.
 */

import type { ZoomConfig } from "@/types/zoom";

const getClientId = () => process.env.ZOOM_CLIENT_ID!;
const getClientSecret = () => process.env.ZOOM_CLIENT_SECRET!;
const getRedirectUri = () =>
  `${process.env.NEXTAUTH_URL || "http://localhost:3113"}/api/data/app/zoom/callback`;

/**
 * Build basic auth header for Zoom OAuth token endpoints
 */
function getBasicAuthHeader(): string {
  return Buffer.from(`${getClientId()}:${getClientSecret()}`).toString(
    "base64",
  );
}

/**
 * Build the Zoom OAuth consent URL
 */
export function buildZoomOAuthUrl(tenantId: string): string {
  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    state,
  });

  return `https://zoom.us/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeZoomCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
}> {
  console.log("[DBG][zoom] Exchanging code for tokens");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuthHeader()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: getRedirectUri(),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][zoom] Token exchange failed:", errorText);
    throw new Error("Failed to exchange Zoom authorization code");
  }

  const data = await res.json();

  if (!data.access_token || !data.refresh_token) {
    throw new Error("Missing access_token or refresh_token from Zoom OAuth");
  }

  const tokenExpiry = new Date(
    Date.now() + (data.expires_in || 3600) * 1000,
  ).toISOString();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiry,
  };
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshZoomAccessToken(
  config: ZoomConfig,
): Promise<ZoomConfig> {
  console.log("[DBG][zoom] Refreshing access token");

  const res = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${getBasicAuthHeader()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][zoom] Token refresh failed:", errorText);
    throw new Error("Failed to refresh Zoom access token");
  }

  const data = await res.json();

  if (!data.access_token) {
    throw new Error("Failed to refresh Zoom access token");
  }

  const tokenExpiry = new Date(
    Date.now() + (data.expires_in || 3600) * 1000,
  ).toISOString();

  return {
    ...config,
    accessToken: data.access_token,
    refreshToken: data.refresh_token || config.refreshToken,
    tokenExpiry,
  };
}

/**
 * Revoke Zoom OAuth token
 */
export async function revokeZoomToken(accessToken: string): Promise<void> {
  try {
    const res = await fetch("https://zoom.us/oauth/revoke", {
      method: "POST",
      headers: {
        Authorization: `Basic ${getBasicAuthHeader()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ token: accessToken }),
    });

    if (res.ok) {
      console.log("[DBG][zoom] Token revoked");
    } else {
      console.warn("[DBG][zoom] Token revocation failed:", await res.text());
    }
  } catch (error) {
    console.warn("[DBG][zoom] Token revocation failed:", error);
    // Non-critical — token may already be invalid
  }
}

/**
 * Fetch the authenticated Zoom user's email
 */
export async function fetchZoomUserEmail(accessToken: string): Promise<string> {
  const res = await fetch("https://api.zoom.us/v2/users/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Zoom user info");
  }

  const data = await res.json();

  if (!data.email) {
    throw new Error("Could not retrieve Zoom email");
  }

  return data.email;
}

/**
 * Get an authenticated Zoom client config.
 * Auto-refreshes the token if expired (within 5 min buffer).
 * Returns the updated config with a valid access token.
 */
export async function getZoomClient(
  config: ZoomConfig,
): Promise<{ updatedConfig: ZoomConfig }> {
  let currentConfig = config;

  const expiresAt = new Date(currentConfig.tokenExpiry).getTime();
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() >= expiresAt - bufferMs) {
    console.log("[DBG][zoom] Token expired or expiring soon");
    currentConfig = await refreshZoomAccessToken(currentConfig);
  }

  return { updatedConfig: currentConfig };
}

/**
 * Create a Zoom meeting
 * Returns the meeting ID and join URL
 */
export async function createZoomMeeting(
  config: ZoomConfig,
  title: string,
  startTime: string,
  durationMinutes: number,
): Promise<{ meetingId: string; joinUrl: string }> {
  console.log("[DBG][zoom] Creating meeting:", title);

  // Ensure we have a valid token
  const { updatedConfig } = await getZoomClient(config);

  const res = await fetch("https://api.zoom.us/v2/users/me/meetings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${updatedConfig.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: title,
      type: 2, // Scheduled meeting
      start_time: startTime,
      duration: durationMinutes,
      settings: {
        join_before_host: true,
        waiting_room: false,
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("[DBG][zoom] Meeting creation failed:", errorText);
    throw new Error("Failed to create Zoom meeting");
  }

  const data = await res.json();

  console.log(
    "[DBG][zoom] Created meeting:",
    data.id,
    "join_url:",
    data.join_url,
  );

  return {
    meetingId: String(data.id),
    joinUrl: data.join_url,
  };
}
