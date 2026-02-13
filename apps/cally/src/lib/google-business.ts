/**
 * Google Business Profile API client for CallyGo
 *
 * Provides functions to interact with Google Business Profile:
 * - OAuth token management (build URL, exchange, refresh, revoke)
 * - Account & location listing
 * - Reviews listing and reply management
 *
 * Note: The GBP Reviews API is not in the googleapis npm package,
 * so we use raw fetch() for reviews endpoints.
 */

import { google } from "googleapis";
import type {
  GoogleBusinessConfig,
  GoogleReview,
} from "@/types/google-business";

const getClientId = () => process.env.GOOGLE_CLIENT_ID!;
const getClientSecret = () => process.env.GOOGLE_CLIENT_SECRET!;
const getRedirectUri = () =>
  `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/data/app/google-business/callback`;

/**
 * Build the Google OAuth2 consent URL for Business Profile
 */
export function buildGoogleBusinessOAuthUrl(tenantId: string): string {
  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );

  const state = Buffer.from(JSON.stringify({ tenantId })).toString("base64");

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [
      "https://www.googleapis.com/auth/business.manage",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    state,
  });
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeGBPCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
}> {
  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error("Missing access_token or refresh_token from Google OAuth");
  }

  const tokenExpiry = tokens.expiry_date
    ? new Date(tokens.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    tokenExpiry,
  };
}

/**
 * Fetch the authenticated user's email from Google
 */
export async function fetchGBPUserEmail(accessToken: string): Promise<string> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
  const { data } = await oauth2.userinfo.get();

  if (!data.email) {
    throw new Error("Could not retrieve Google email");
  }

  return data.email;
}

/**
 * Refresh an access token using the refresh token
 */
export async function refreshGBPAccessToken(
  config: GoogleBusinessConfig,
): Promise<GoogleBusinessConfig> {
  console.log("[DBG][google-business] Refreshing access token");

  const oauth2Client = new google.auth.OAuth2(
    getClientId(),
    getClientSecret(),
    getRedirectUri(),
  );

  oauth2Client.setCredentials({ refresh_token: config.refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();

  if (!credentials.access_token) {
    throw new Error("Failed to refresh Google access token");
  }

  const tokenExpiry = credentials.expiry_date
    ? new Date(credentials.expiry_date).toISOString()
    : new Date(Date.now() + 3600 * 1000).toISOString();

  return {
    ...config,
    accessToken: credentials.access_token,
    tokenExpiry,
  };
}

/**
 * Get auth headers, refreshing token if needed.
 * Returns updated config (with new token if refreshed) and headers.
 */
export async function getAuthHeaders(config: GoogleBusinessConfig): Promise<{
  headers: Record<string, string>;
  updatedConfig: GoogleBusinessConfig;
}> {
  let currentConfig = config;

  // Refresh token if expired or about to expire (within 5 min)
  const expiresAt = new Date(currentConfig.tokenExpiry).getTime();
  const bufferMs = 5 * 60 * 1000;

  if (Date.now() >= expiresAt - bufferMs) {
    console.log("[DBG][google-business] Token expired or expiring soon");
    currentConfig = await refreshGBPAccessToken(currentConfig);
  }

  return {
    headers: {
      Authorization: `Bearer ${currentConfig.accessToken}`,
      "Content-Type": "application/json",
    },
    updatedConfig: currentConfig,
  };
}

/**
 * List GBP accounts for the authenticated user
 */
export async function listGBPAccounts(config: GoogleBusinessConfig): Promise<{
  accounts: Array<{ name: string; accountName: string }>;
  updatedConfig: GoogleBusinessConfig;
}> {
  const { headers, updatedConfig } = await getAuthHeaders(config);

  const res = await fetch(
    "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
    { headers },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("[DBG][google-business] Failed to list accounts:", body);
    throw new Error(`Failed to list GBP accounts: ${res.status}`);
  }

  const data = await res.json();
  const accounts = (data.accounts || []).map(
    (a: { name: string; accountName: string }) => ({
      name: a.name,
      accountName: a.accountName,
    }),
  );

  console.log("[DBG][google-business] Found", accounts.length, "accounts");

  return { accounts, updatedConfig };
}

/**
 * List locations for a GBP account
 */
export async function listGBPLocations(
  config: GoogleBusinessConfig,
  accountId: string,
): Promise<{
  locations: Array<{ name: string; title: string }>;
  updatedConfig: GoogleBusinessConfig;
}> {
  const { headers, updatedConfig } = await getAuthHeaders(config);

  const res = await fetch(
    `https://mybusinessbusinessinformation.googleapis.com/v1/${accountId}/locations?readMask=name,title`,
    { headers },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("[DBG][google-business] Failed to list locations:", body);
    throw new Error(`Failed to list GBP locations: ${res.status}`);
  }

  const data = await res.json();
  const locations = (data.locations || []).map(
    (l: { name: string; title: string }) => ({
      name: l.name,
      title: l.title,
    }),
  );

  console.log("[DBG][google-business] Found", locations.length, "locations");

  return { locations, updatedConfig };
}

/**
 * List Google Reviews for a location
 */
export async function listGBPReviews(
  config: GoogleBusinessConfig,
  pageToken?: string,
): Promise<{
  reviews: GoogleReview[];
  averageRating: number;
  totalReviewCount: number;
  nextPageToken?: string;
  updatedConfig: GoogleBusinessConfig;
}> {
  const { headers, updatedConfig } = await getAuthHeaders(config);

  const url = new URL(
    `https://mybusiness.googleapis.com/v4/${config.accountId}/${config.locationId}/reviews`,
  );
  if (pageToken) {
    url.searchParams.set("pageToken", pageToken);
  }

  const res = await fetch(url.toString(), { headers });

  if (!res.ok) {
    const body = await res.text();
    console.error("[DBG][google-business] Failed to list reviews:", body);
    throw new Error(`Failed to list GBP reviews: ${res.status}`);
  }

  const data = await res.json();

  const reviews: GoogleReview[] = (data.reviews || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      reviewId: r.reviewId,
      reviewer: {
        displayName: r.reviewer?.displayName || "Anonymous",
        profilePhotoUrl: r.reviewer?.profilePhotoUrl,
      },
      starRating: r.starRating,
      comment: r.comment,
      createTime: r.createTime,
      updateTime: r.updateTime,
      reviewReply: r.reviewReply
        ? {
            comment: r.reviewReply.comment,
            updateTime: r.reviewReply.updateTime,
          }
        : undefined,
    }),
  );

  console.log("[DBG][google-business] Found", reviews.length, "reviews");

  return {
    reviews,
    averageRating: data.averageRating || 0,
    totalReviewCount: data.totalReviewCount || 0,
    nextPageToken: data.nextPageToken,
    updatedConfig,
  };
}

/**
 * Reply to a Google Review
 */
export async function replyToGBPReview(
  config: GoogleBusinessConfig,
  reviewId: string,
  comment: string,
): Promise<{ updatedConfig: GoogleBusinessConfig }> {
  const { headers, updatedConfig } = await getAuthHeaders(config);

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${config.accountId}/${config.locationId}/reviews/${reviewId}/reply`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ comment }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error("[DBG][google-business] Failed to reply to review:", body);
    throw new Error(`Failed to reply to review: ${res.status}`);
  }

  console.log("[DBG][google-business] Replied to review:", reviewId);
  return { updatedConfig };
}

/**
 * Delete a reply to a Google Review
 */
export async function deleteGBPReviewReply(
  config: GoogleBusinessConfig,
  reviewId: string,
): Promise<{ updatedConfig: GoogleBusinessConfig }> {
  const { headers, updatedConfig } = await getAuthHeaders(config);

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${config.accountId}/${config.locationId}/reviews/${reviewId}/reply`,
    {
      method: "DELETE",
      headers,
    },
  );

  if (!res.ok) {
    const body = await res.text();
    console.error(
      "[DBG][google-business] Failed to delete review reply:",
      body,
    );
    throw new Error(`Failed to delete review reply: ${res.status}`);
  }

  console.log("[DBG][google-business] Deleted reply for review:", reviewId);
  return { updatedConfig };
}

/**
 * Revoke Google OAuth token
 */
export async function revokeGBPToken(accessToken: string): Promise<void> {
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });

  try {
    await oauth2Client.revokeToken(accessToken);
    console.log("[DBG][google-business] Token revoked");
  } catch (error) {
    console.warn("[DBG][google-business] Token revocation failed:", error);
    // Non-critical - token may already be invalid
  }
}
