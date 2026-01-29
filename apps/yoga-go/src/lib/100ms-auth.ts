/**
 * 100ms Authentication
 *
 * Handles JWT token generation for 100ms video conferencing
 * Unlike Zoom/Google Meet, 100ms uses app-level API credentials
 * No per-expert OAuth needed - just env vars
 */

import * as jose from 'jose';
import { v4 as uuidv4 } from 'uuid';

// 100ms configuration from environment
const HMS_APP_ACCESS_KEY = process.env.HMS_APP_ACCESS_KEY;
const HMS_APP_SECRET = process.env.HMS_APP_SECRET;
const HMS_TEMPLATE_ID = process.env.HMS_TEMPLATE_ID;

// Token expiry
const MANAGEMENT_TOKEN_EXPIRY = '24h';
const AUTH_TOKEN_EXPIRY = '24h';

// 100ms roles
export type HmsRole = 'host' | 'participant';

/**
 * Check if 100ms is configured
 */
export function is100msConfigured(): boolean {
  return Boolean(HMS_APP_ACCESS_KEY && HMS_APP_SECRET && HMS_TEMPLATE_ID);
}

/**
 * Get the default template ID
 */
export function getDefaultTemplateId(): string {
  if (!HMS_TEMPLATE_ID) {
    throw new Error('100ms template ID not configured');
  }
  return HMS_TEMPLATE_ID;
}

/**
 * Generate a management token for 100ms API calls
 * Used for creating rooms, fetching room details, etc.
 */
export async function generateManagementToken(): Promise<string> {
  console.log('[DBG][100ms-auth] Generating management token');

  if (!HMS_APP_ACCESS_KEY || !HMS_APP_SECRET) {
    throw new Error('100ms credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    access_key: HMS_APP_ACCESS_KEY,
    type: 'management',
    version: 2,
    iat: now,
    jti: uuidv4(),
  };

  const secret = new TextEncoder().encode(HMS_APP_SECRET);
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(MANAGEMENT_TOKEN_EXPIRY)
    .sign(secret);

  console.log('[DBG][100ms-auth] Management token generated');
  return token;
}

/**
 * Generate an auth token for client SDK to join a room
 *
 * @param roomId - The 100ms room ID
 * @param userId - Unique user identifier
 * @param role - User role ('host' or 'participant')
 * @param userName - Display name for the user (optional)
 */
export async function generateAuthToken(
  roomId: string,
  userId: string,
  role: HmsRole,
  userName?: string
): Promise<string> {
  console.log('[DBG][100ms-auth] Generating auth token for room:', roomId, 'role:', role);

  if (!HMS_APP_ACCESS_KEY || !HMS_APP_SECRET) {
    throw new Error('100ms credentials not configured');
  }

  const now = Math.floor(Date.now() / 1000);

  const payload: Record<string, unknown> = {
    access_key: HMS_APP_ACCESS_KEY,
    room_id: roomId,
    user_id: userId,
    role: role,
    type: 'app',
    version: 2,
    iat: now,
    jti: uuidv4(),
  };

  // Add user name if provided (used as display name in the room)
  if (userName) {
    payload.name = userName;
  }

  const secret = new TextEncoder().encode(HMS_APP_SECRET);
  const token = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(AUTH_TOKEN_EXPIRY)
    .sign(secret);

  console.log('[DBG][100ms-auth] Auth token generated for user:', userId);
  return token;
}

/**
 * Determine the role for a user joining a session
 *
 * @param isExpert - Whether the user is the expert/host
 */
export function determineRole(isExpert: boolean): HmsRole {
  return isExpert ? 'host' : 'participant';
}
