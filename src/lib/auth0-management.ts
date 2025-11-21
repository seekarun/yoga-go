/**
 * Auth0 Management API Helper
 *
 * This module provides functions to interact with Auth0's Management API.
 * Used for operations that require elevated permissions, such as creating password change tickets.
 */

interface ManagementTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PasswordChangeTicketResponse {
  ticket: string;
}

/**
 * Get Auth0 Management API access token
 *
 * This token is used to authenticate requests to the Management API.
 * Tokens are valid for 24 hours and should be cached in production.
 *
 * @returns Management API access token
 */
async function getManagementToken(): Promise<string> {
  console.log('[DBG][auth0-management] Requesting Management API token');

  const response = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: process.env.AUTH0_MGMT_AUDIENCE,
      grant_type: 'client_credentials',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][auth0-management] Failed to get Management API token:', error);
    throw new Error(`Failed to get Management API token: ${response.status}`);
  }

  const data: ManagementTokenResponse = await response.json();
  console.log('[DBG][auth0-management] Management API token obtained successfully');
  return data.access_token;
}

/**
 * Create password change ticket for authenticated user
 *
 * This generates a secure, time-limited URL that allows a user to change their password.
 * The ticket expires after the specified TTL (default: 1 hour).
 *
 * @param userId - Auth0 user ID (format: auth0|xxxxx)
 * @param resultUrl - URL to redirect user after password change (optional)
 * @returns Password change ticket object with secure URL
 */
export async function createPasswordChangeTicket(
  userId: string,
  resultUrl?: string
): Promise<PasswordChangeTicketResponse> {
  console.log('[DBG][auth0-management] Creating password change ticket for user:', userId);

  // Get Management API access token
  const token = await getManagementToken();

  // Create password change ticket
  const response = await fetch(
    `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/tickets/password-change`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        user_id: userId,
        result_url: resultUrl || `${process.env.AUTH0_BASE_URL}/app/profile/password-success`,
        ttl_sec: 3600, // 1 hour expiration
        mark_email_as_verified: true,
        includeEmailInRedirect: false,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    console.error('[DBG][auth0-management] Failed to create password change ticket:', error);
    throw new Error(`Failed to create password change ticket: ${response.status}`);
  }

  const data: PasswordChangeTicketResponse = await response.json();
  console.log('[DBG][auth0-management] Password change ticket created successfully');
  return data;
}
