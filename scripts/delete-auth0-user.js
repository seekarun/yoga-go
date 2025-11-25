/**
 * Delete Auth0 User Script
 *
 * Deletes a user from Auth0 (not MongoDB).
 * Usage: node scripts/delete-auth0-user.js <auth0_user_id>
 * Example: node scripts/delete-auth0-user.js auth0|6920d3c5bcae9550e0459714
 */

require('dotenv').config({ path: '.env.local' });

async function getManagementToken() {
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
    console.error('[DBG] Failed to get Management API token:', error);
    throw new Error(`Failed to get Management API token: ${response.status}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function deleteAuth0User(userId) {
  try {
    console.log('[DBG] Getting Management API token...');
    const token = await getManagementToken();
    console.log('[DBG] Token obtained');

    // Delete user from Auth0
    const encodedUserId = encodeURIComponent(userId);
    console.log('[DBG] Deleting Auth0 user:', userId);

    const response = await fetch(
      `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${encodedUserId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('[DBG] Failed to delete user:', error);
      throw new Error(`Failed to delete user: ${response.status}`);
    }

    console.log('\n✅ SUCCESS! Auth0 user deleted:', userId);
    process.exit(0);
  } catch (error) {
    console.error('[DBG] Error:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 1) {
  console.error('Usage: node scripts/delete-auth0-user.js <auth0_user_id>');
  console.error('Example: node scripts/delete-auth0-user.js auth0|6920d3c5bcae9550e0459714');
  process.exit(1);
}

const [userId] = args;

// Run the deletion
deleteAuth0User(userId);
