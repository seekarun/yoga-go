/**
 * Google OAuth Authentication
 *
 * Handles OAuth flow for experts to connect their Google accounts
 * Used for creating Google Meet links and Calendar events
 */

import { google } from 'googleapis';
import * as expertGoogleAuthRepository from './repositories/expertGoogleAuthRepository';
import type { ExpertGoogleAuth } from '@/types';

// Google OAuth configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Calendar OAuth redirect URI (for connecting Google Calendar/Meet)
const GOOGLE_CALENDAR_REDIRECT_URI =
  process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
  `${process.env.BASE_URL || 'https://myyoga.guru'}/api/auth/google-calendar/callback`;

// Scopes required for Google Meet and Calendar
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

// Required scopes for creating Meet links
const MEET_REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

/**
 * Create OAuth2 client
 */
function createOAuth2Client() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI
  );
}

/**
 * Generate authorization URL for expert to connect Google account
 * @param expertId - The expert's profile ID
 * @param loginHint - Optional email to pre-select in Google's account picker
 */
export function getAuthorizationUrl(expertId: string, loginHint?: string): string {
  console.log(
    '[DBG][google-auth] Generating auth URL for expert:',
    expertId,
    'loginHint:',
    loginHint
  );

  const oauth2Client = createOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required for refresh token
    scope: SCOPES,
    prompt: 'consent', // Force consent to get refresh token
    state: expertId, // Pass expertId through OAuth flow
    login_hint: loginHint, // Pre-select account if user logged in with Google
  });

  console.log('[DBG][google-auth] Auth URL generated');
  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  expertId: string
): Promise<ExpertGoogleAuth> {
  console.log('[DBG][google-auth] Exchanging code for tokens for expert:', expertId);

  const oauth2Client = createOAuth2Client();

  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to get tokens from Google');
  }

  // Set credentials to get user info
  oauth2Client.setCredentials(tokens);

  // Get user email
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const userInfo = await oauth2.userinfo.get();
  const email = userInfo.data.email || '';

  // Calculate expiry time
  const expiresAt = new Date(Date.now() + (tokens.expiry_date || 3600 * 1000)).toISOString();

  // Save tokens to database
  const auth: ExpertGoogleAuth = {
    id: expertId,
    expertId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt,
    email,
    scope: tokens.scope || SCOPES.join(' '),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await expertGoogleAuthRepository.saveGoogleAuth(auth);

  console.log('[DBG][google-auth] Tokens saved for expert:', expertId, 'email:', email);
  return auth;
}

/**
 * Get a valid OAuth2 client for an expert
 * Automatically refreshes token if expired
 */
export async function getOAuth2ClientForExpert(expertId: string) {
  console.log('[DBG][google-auth] Getting OAuth client for expert:', expertId);

  const auth = await expertGoogleAuthRepository.getGoogleAuth(expertId);
  if (!auth) {
    throw new Error('Expert has not connected Google account');
  }

  const oauth2Client = createOAuth2Client();

  // Check if token needs refresh
  if (expertGoogleAuthRepository.isTokenExpired(auth)) {
    console.log('[DBG][google-auth] Token expired, refreshing...');

    oauth2Client.setCredentials({
      refresh_token: auth.refreshToken,
    });

    const { credentials } = await oauth2Client.refreshAccessToken();

    if (!credentials.access_token) {
      throw new Error('Failed to refresh access token');
    }

    // Update stored tokens
    const expiresAt = new Date(Date.now() + (credentials.expiry_date || 3600 * 1000)).toISOString();

    await expertGoogleAuthRepository.updateGoogleAuth(expertId, {
      accessToken: credentials.access_token,
      expiresAt,
    });

    oauth2Client.setCredentials(credentials);
    console.log('[DBG][google-auth] Token refreshed');
  } else {
    oauth2Client.setCredentials({
      access_token: auth.accessToken,
      refresh_token: auth.refreshToken,
    });
  }

  return oauth2Client;
}

/**
 * Disconnect Google account for an expert
 */
export async function disconnectGoogle(expertId: string): Promise<void> {
  console.log('[DBG][google-auth] Disconnecting Google for expert:', expertId);

  const auth = await expertGoogleAuthRepository.getGoogleAuth(expertId);
  if (!auth) {
    console.log('[DBG][google-auth] No Google auth found');
    return;
  }

  // Try to revoke token (best effort)
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: auth.accessToken,
    });
    await oauth2Client.revokeToken(auth.accessToken);
    console.log('[DBG][google-auth] Token revoked');
  } catch (error) {
    console.warn('[DBG][google-auth] Failed to revoke token:', error);
  }

  // Delete from database
  await expertGoogleAuthRepository.deleteGoogleAuth(expertId);
  console.log('[DBG][google-auth] Google disconnected');
}

/**
 * Check if expert has connected Google account
 */
export async function isGoogleConnected(expertId: string): Promise<boolean> {
  return expertGoogleAuthRepository.isGoogleConnected(expertId);
}

/**
 * Get connected Google account info for an expert
 */
export async function getGoogleAccountInfo(
  expertId: string
): Promise<{ connected: boolean; email?: string }> {
  const auth = await expertGoogleAuthRepository.getGoogleAuth(expertId);
  if (!auth) {
    return { connected: false };
  }
  return {
    connected: true,
    email: auth.email,
  };
}

/**
 * Check if expert's Google token has required scopes for Meet/Calendar
 * Returns object with hasRequiredScopes boolean and missing scopes list
 */
export async function checkMeetScopes(
  expertId: string
): Promise<{ hasRequiredScopes: boolean; missingScopes: string[]; storedScopes: string[] }> {
  const auth = await expertGoogleAuthRepository.getGoogleAuth(expertId);
  if (!auth) {
    return {
      hasRequiredScopes: false,
      missingScopes: MEET_REQUIRED_SCOPES,
      storedScopes: [],
    };
  }

  // Parse stored scopes (space-separated string)
  const storedScopes = auth.scope ? auth.scope.split(' ') : [];

  // Check which required scopes are missing
  const missingScopes = MEET_REQUIRED_SCOPES.filter(
    requiredScope => !storedScopes.includes(requiredScope)
  );

  console.log('[DBG][google-auth] Scope check for expert:', expertId, {
    storedScopes,
    missingScopes,
    hasRequired: missingScopes.length === 0,
  });

  return {
    hasRequiredScopes: missingScopes.length === 0,
    missingScopes,
    storedScopes,
  };
}
