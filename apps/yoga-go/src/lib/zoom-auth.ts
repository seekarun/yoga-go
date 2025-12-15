/**
 * Zoom OAuth Authentication
 *
 * Handles OAuth flow for experts to connect their Zoom accounts
 * Used for creating Zoom meeting links
 */

import * as expertZoomAuthRepository from './repositories/expertZoomAuthRepository';
import type { ExpertZoomAuth } from '@/types';

// Zoom OAuth configuration
const ZOOM_CLIENT_ID = process.env.ZOOM_CLIENT_ID;
const ZOOM_CLIENT_SECRET = process.env.ZOOM_CLIENT_SECRET;
const ZOOM_REDIRECT_URI =
  process.env.ZOOM_REDIRECT_URI || 'https://myyoga.guru/api/auth/zoom/callback';

// Zoom OAuth URLs
const ZOOM_AUTH_URL = 'https://zoom.us/oauth/authorize';
const ZOOM_TOKEN_URL = 'https://zoom.us/oauth/token';
const ZOOM_API_URL = 'https://api.zoom.us/v2';

// Scopes required for Zoom meetings
// Note: Zoom scopes are configured in the app settings, not in the auth URL
// These are for documentation purposes
const SCOPES = ['meeting:write', 'user:read'];

/**
 * Generate authorization URL for expert to connect Zoom account
 * @param expertId - The expert's profile ID
 */
export function getAuthorizationUrl(expertId: string): string {
  console.log('[DBG][zoom-auth] Generating auth URL for expert:', expertId);

  if (!ZOOM_CLIENT_ID) {
    throw new Error('Zoom OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: ZOOM_CLIENT_ID,
    redirect_uri: ZOOM_REDIRECT_URI,
    state: expertId, // Pass expertId through OAuth flow
  });

  const authUrl = `${ZOOM_AUTH_URL}?${params.toString()}`;

  console.log('[DBG][zoom-auth] Auth URL generated');
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  expertId: string
): Promise<ExpertZoomAuth> {
  console.log('[DBG][zoom-auth] Exchanging code for tokens for expert:', expertId);

  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('Zoom OAuth credentials not configured');
  }

  // Base64 encode client credentials for Basic auth
  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  // Exchange code for tokens
  const tokenResponse = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: ZOOM_REDIRECT_URI,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('[DBG][zoom-auth] Token exchange failed:', error);
    throw new Error(`Failed to get tokens from Zoom: ${error}`);
  }

  const tokens = await tokenResponse.json();

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Zoom');
  }

  // Get user info
  const userInfo = await getZoomUserInfo(tokens.access_token);

  // Calculate expiry time (Zoom tokens typically expire in 1 hour)
  const expiresInMs = (tokens.expires_in || 3600) * 1000;
  const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

  // Save tokens to database
  const auth: ExpertZoomAuth = {
    id: expertId,
    expertId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    email: userInfo.email || '',
    accountId: userInfo.account_id || '',
    userId: userInfo.id || '',
    scope: tokens.scope || SCOPES.join(' '),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await expertZoomAuthRepository.saveZoomAuth(auth);

  console.log('[DBG][zoom-auth] Tokens saved for expert:', expertId, 'email:', userInfo.email);
  return auth;
}

/**
 * Get Zoom user information
 */
async function getZoomUserInfo(accessToken: string): Promise<{
  id: string;
  email: string;
  account_id: string;
}> {
  const response = await fetch(`${ZOOM_API_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][zoom-auth] Failed to get user info:', error);
    throw new Error('Failed to get Zoom user info');
  }

  return response.json();
}

/**
 * Refresh access token
 */
async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
    throw new Error('Zoom OAuth credentials not configured');
  }

  const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(ZOOM_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][zoom-auth] Token refresh failed:', error);
    throw new Error(`Failed to refresh Zoom token: ${error}`);
  }

  return response.json();
}

/**
 * Get a valid access token for an expert
 * Automatically refreshes token if expired
 */
export async function getValidAccessToken(expertId: string): Promise<string> {
  console.log('[DBG][zoom-auth] Getting valid access token for expert:', expertId);

  const auth = await expertZoomAuthRepository.getZoomAuth(expertId);
  if (!auth) {
    throw new Error('Expert has not connected Zoom account');
  }

  // Check if token needs refresh
  if (expertZoomAuthRepository.isTokenExpired(auth)) {
    console.log('[DBG][zoom-auth] Token expired, refreshing...');

    const tokens = await refreshAccessToken(auth.refreshToken);

    // Calculate new expiry time
    const expiresInMs = (tokens.expires_in || 3600) * 1000;
    const expiresAt = new Date(Date.now() + expiresInMs).toISOString();

    // Update stored tokens
    await expertZoomAuthRepository.updateZoomAuth(expertId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt,
    });

    console.log('[DBG][zoom-auth] Token refreshed');
    return tokens.access_token;
  }

  return auth.accessToken;
}

/**
 * Disconnect Zoom account for an expert
 */
export async function disconnectZoom(expertId: string): Promise<void> {
  console.log('[DBG][zoom-auth] Disconnecting Zoom for expert:', expertId);

  const auth = await expertZoomAuthRepository.getZoomAuth(expertId);
  if (!auth) {
    console.log('[DBG][zoom-auth] No Zoom auth found');
    return;
  }

  // Try to revoke token (best effort)
  try {
    if (!ZOOM_CLIENT_ID || !ZOOM_CLIENT_SECRET) {
      throw new Error('Zoom OAuth credentials not configured');
    }

    const credentials = Buffer.from(`${ZOOM_CLIENT_ID}:${ZOOM_CLIENT_SECRET}`).toString('base64');

    await fetch(`${ZOOM_TOKEN_URL}/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        token: auth.accessToken,
      }),
    });
    console.log('[DBG][zoom-auth] Token revoked');
  } catch (error) {
    console.warn('[DBG][zoom-auth] Failed to revoke token:', error);
  }

  // Delete from database
  await expertZoomAuthRepository.deleteZoomAuth(expertId);
  console.log('[DBG][zoom-auth] Zoom disconnected');
}

/**
 * Check if expert has connected Zoom account
 */
export async function isZoomConnected(expertId: string): Promise<boolean> {
  return expertZoomAuthRepository.isZoomConnected(expertId);
}

/**
 * Get connected Zoom account info for an expert
 */
export async function getZoomAccountInfo(
  expertId: string
): Promise<{ connected: boolean; email?: string }> {
  const auth = await expertZoomAuthRepository.getZoomAuth(expertId);
  if (!auth) {
    return { connected: false };
  }
  return {
    connected: true,
    email: auth.email,
  };
}
