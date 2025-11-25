/**
 * Update User Role Script
 *
 * Updates a user's role in both MongoDB and Auth0 app_metadata.
 * Usage: node scripts/update-user-role.js <email> <role>
 * Example: node scripts/update-user-role.js user@example.com expert
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

// Define User schema matching the actual model
const UserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    auth0Id: { type: String, required: true, unique: true },
    role: { type: String, enum: ['learner', 'expert', 'admin'], default: 'learner' },
    profile: {
      name: String,
      email: String,
      username: String,
      bio: String,
      avatar: String,
      nameIsFromEmail: Boolean,
      onboardingCompleted: Boolean,
      experienceLevel: String,
      weight: Number,
      weightUnit: String,
      height: Number,
      heightUnit: String,
      preconditions: String,
      joinedAt: String,
    },
  },
  { strict: false }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function updateAuth0UserMetadata(userId, role) {
  console.log('[DBG] Updating Auth0 app_metadata for user:', userId, 'role:', role);

  // Get Management API access token
  const tokenResponse = await fetch(`${process.env.AUTH0_ISSUER_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.AUTH0_MGMT_CLIENT_ID,
      client_secret: process.env.AUTH0_MGMT_CLIENT_SECRET,
      audience: process.env.AUTH0_MGMT_AUDIENCE,
      grant_type: 'client_credentials',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error('[DBG] Failed to get Management API token:', error);
    throw new Error(`Failed to get Management API token: ${tokenResponse.status}`);
  }

  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token;

  console.log('[DBG] Management API token obtained successfully');

  // Update user's app_metadata
  const encodedUserId = encodeURIComponent(userId);
  const updateResponse = await fetch(
    `${process.env.AUTH0_ISSUER_BASE_URL}/api/v2/users/${encodedUserId}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        app_metadata: {
          role: role,
        },
      }),
    }
  );

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    console.error('[DBG] Failed to update user metadata:', error);
    throw new Error(`Failed to update user metadata: ${updateResponse.status}`);
  }

  console.log('[DBG] Auth0 app_metadata updated successfully with role:', role);
}

async function updateUserRole(email, newRole) {
  try {
    console.log('[DBG] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[DBG] Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ 'profile.email': email });

    if (!user) {
      console.error('[DBG] User not found with email:', email);
      process.exit(1);
    }

    console.log('[DBG] Found user:', {
      id: user._id,
      email: user.profile.email,
      name: user.profile.name,
      currentRole: user.role,
      auth0Id: user.auth0Id,
    });

    // Update role in MongoDB
    user.role = newRole;
    await user.save();
    console.log('[DBG] Updated MongoDB role to:', newRole);

    // Update Auth0 app_metadata
    if (user.auth0Id) {
      await updateAuth0UserMetadata(user.auth0Id, newRole);
      console.log('[DBG] Updated Auth0 app_metadata');
    } else {
      console.warn('[DBG] No auth0Id found, skipping Auth0 update');
    }

    console.log('\n✅ SUCCESS! User role updated:');
    console.log('  Email:', email);
    console.log('  New Role:', newRole);
    console.log('  MongoDB: ✓');
    console.log('  Auth0: ✓');
    console.log('\nUser needs to log out and log back in to see changes.');

    process.exit(0);
  } catch (error) {
    console.error('[DBG] Error updating user role:', error);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.error('Usage: node scripts/update-user-role.js <email> <role>');
  console.error('Example: node scripts/update-user-role.js user@example.com expert');
  console.error('\nValid roles: learner, expert, admin');
  process.exit(1);
}

const [email, role] = args;

if (!['learner', 'expert', 'admin'].includes(role)) {
  console.error('Invalid role. Must be one of: learner, expert, admin');
  process.exit(1);
}

// Run the update
updateUserRole(email, role);
