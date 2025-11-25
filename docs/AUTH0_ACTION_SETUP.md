# Auth0 Post-Login Action Setup Guide

This guide explains how to set up the Auth0 Post-Login Action to properly handle user roles.

## Why This Action Is Needed

The Post-Login Action solves several critical issues:

1. **Role Persistence**: Ensures expert signups maintain their role even after email verification
2. **Single Source of Truth**: Auth0 `app_metadata` becomes the authoritative source for user roles
3. **Token Claims**: Role is added to JWT tokens so the app can read it without database calls
4. **Survives Email Verification**: Role stored in app_metadata before verification, persists after

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│ Role Flow: Auth0 as Source of Truth                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Signup → Auth0 Post-Login Action sets app_metadata.role  │
│ 2. Every login → Role added to JWT as namespaced claim      │
│ 3. Callback route → Reads role from JWT, syncs to MongoDB   │
│ 4. MongoDB user.role → Synced copy for queries/reporting    │
│                                                             │
│ If roles diverge: Auth0 wins (callback syncs from token)    │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

Before setting up the Action, ensure you have:

1. An Auth0 account with access to the Dashboard
2. Your application deployed and accessible (for API endpoint)
3. The following environment variables configured in your app:
   - `AUTH0_ACTION_SECRET` - A secure random string (generate with `openssl rand -hex 32`)

## Step 1: Create the Post-Login Action

1. Go to **Auth0 Dashboard** → **Actions** → **Flows** → **Login**
2. Click **+ Add Action** → **Build Custom**
3. Name: `Set User Role`
4. Trigger: **Login / Post Login**
5. Click **Create**

## Step 2: Add the Action Code

Paste the following code into the Action editor:

```javascript
/**
 * Auth0 Post-Login Action: Set User Role
 *
 * This action:
 * 1. Checks if user has a role in app_metadata (existing users)
 * 2. If not, looks up auth_token to determine if expert or learner
 * 3. Sets role in app_metadata (persists across logins)
 * 4. Adds role to ID token and access token as NAMESPACED claim
 *
 * IMPORTANT: Role-based redirects are handled by the app's callback route,
 * NOT by this action. This ensures more reliable redirect behavior.
 */

exports.onExecutePostLogin = async (event, api) => {
  // CRITICAL: Use namespaced claims - Auth0 silently drops non-namespaced custom claims
  const NAMESPACE = 'https://myyoga.guru';

  console.log('[Auth0 Action] Post-Login for:', event.user.user_id);
  console.log('[Auth0 Action] Email verified:', event.user.email_verified);
  console.log('[Auth0 Action] Query params:', JSON.stringify(event.request.query || {}));
  console.log(
    '[Auth0 Action] Current app_metadata:',
    JSON.stringify(event.user.app_metadata || {})
  );

  // Check if user already has a role in app_metadata (existing user)
  let role = event.user.app_metadata?.role;
  let isNewUser = !role;

  if (role) {
    console.log('[Auth0 Action] Existing user, role from app_metadata:', role);
  } else {
    console.log('[Auth0 Action] New user or no role in app_metadata, checking for auth_token');

    // Extract auth_token from returnTo parameter or query params
    // The auth_token is passed via: /auth/callback?auth_token=xxx
    // NOTE: returnTo may be URL-encoded, so we need to decode it first
    let returnTo = event.request.query?.returnTo || '';

    // Decode URL-encoded returnTo if necessary
    if (returnTo.includes('%')) {
      try {
        returnTo = decodeURIComponent(returnTo);
        console.log('[Auth0 Action] Decoded returnTo:', returnTo);
      } catch (e) {
        console.log('[Auth0 Action] Could not decode returnTo');
      }
    }

    console.log('[Auth0 Action] returnTo:', returnTo);

    // Try to extract auth_token from returnTo URL
    let authToken = null;

    // Method 1: regex match for auth_token parameter
    const authTokenMatch = returnTo.match(/auth_token=([^&]+)/);
    if (authTokenMatch) {
      authToken = authTokenMatch[1];
      console.log('[Auth0 Action] Found auth_token in returnTo');
    }

    // Method 2: check direct query param (fallback)
    if (!authToken && event.request.query?.auth_token) {
      authToken = event.request.query.auth_token;
      console.log('[Auth0 Action] Found auth_token in query params');
    }

    console.log(
      '[Auth0 Action] auth_token:',
      authToken ? authToken.substring(0, 8) + '...' : 'none'
    );

    // Track if we successfully got role from API
    let gotRoleFromAPI = false;

    if (authToken) {
      try {
        const apiUrl = `${event.secrets.APP_BASE_URL}/api/auth/pending-auth/${authToken}`;
        console.log('[Auth0 Action] Calling API:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            'x-action-secret': event.secrets.AUTH0_ACTION_SECRET,
            'Content-Type': 'application/json',
          },
        });

        console.log('[Auth0 Action] API response status:', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('[Auth0 Action] API response:', JSON.stringify(data));

          if (data.success && data.data?.role) {
            role = data.data.role;
            gotRoleFromAPI = true;
            console.log('[Auth0 Action] Got role from API:', role);
          } else {
            console.log('[Auth0 Action] API returned no role');
          }
        } else {
          const errorText = await response.text();
          console.log('[Auth0 Action] API error:', response.status, errorText);
        }
      } catch (error) {
        console.error('[Auth0 Action] Error calling API:', error.message);
      }
    } else {
      console.log('[Auth0 Action] No auth_token found in returnTo or query params');
    }

    // IMPORTANT: Only default to learner if:
    // 1. No existing role in app_metadata AND
    // 2. No auth_token was provided (truly new user from regular login)
    // If auth_token was provided but API failed, DON'T set role - let the app handle it
    if (!role) {
      if (authToken && !gotRoleFromAPI) {
        // Had auth_token but API failed - don't set any role, let app fallback handle it
        console.log(
          '[Auth0 Action] API call failed, skipping role assignment (app will use MongoDB fallback)'
        );
      } else {
        // No auth_token = regular login/signup, default to learner
        role = 'learner';
        console.log('[Auth0 Action] No auth_token provided, defaulting to learner');
      }
    }

    // Only set app_metadata if we have a definitive role
    if (role) {
      api.user.setAppMetadata('role', role);
      console.log('[Auth0 Action] Set app_metadata.role:', role);
    }
  }

  // Add role to tokens (may be undefined if API failed - app will handle fallback)
  if (role) {
    api.idToken.setCustomClaim(`${NAMESPACE}/role`, role);
    api.accessToken.setCustomClaim(`${NAMESPACE}/role`, role);
    console.log('[Auth0 Action] Added token claim:', `${NAMESPACE}/role =`, role);
  } else {
    console.log('[Auth0 Action] No role to add to token - app will use MongoDB fallback');
  }

  // NOTE: We do NOT redirect here - the app's callback route handles redirects
  // This is more reliable and easier to debug
  console.log('[Auth0 Action] Completed');
};
```

## Step 3: Configure Action Secrets

In the Action editor, go to the **Secrets** tab (left sidebar) and add:

| Key                   | Value                                            | Description                             |
| --------------------- | ------------------------------------------------ | --------------------------------------- |
| `APP_BASE_URL`        | `https://myyoga.guru` or `http://localhost:3111` | Your application's base URL             |
| `AUTH0_ACTION_SECRET` | `<random-secret>`                                | Same value as in your app's `.env` file |

**Important**:

- For local development, use `http://localhost:3111`
- For production, use your actual domain (e.g., `https://myyoga.guru`)
- Generate the secret with: `openssl rand -hex 32`

## Step 4: Add the Action to Login Flow

1. Click **Deploy** in the Action editor
2. Go back to **Actions** → **Flows** → **Login**
3. Drag the **Set User Role** action from the right sidebar
4. Drop it into the flow between **Start** and **Complete**
5. Click **Apply**

The flow should look like:

```
Start → Set User Role → Complete
```

## Step 5: Update Environment Variables

Add to your `.env.local` file:

```bash
# Auth0 Action Secret (must match what you set in Auth0 Action secrets)
AUTH0_ACTION_SECRET=<your-random-secret-here>
```

## Step 6: Configure SendGrid for Email (Optional)

To use SendGrid for Auth0 verification emails:

1. Go to **Branding** → **Email Provider**
2. Select **SendGrid**
3. Enter your SendGrid API key
4. Set From email: `noreply@myyoga.guru` (or your verified domain)
5. Save changes

To customize the verification email template:

1. Go to **Branding** → **Email Templates** → **Verification Email (using Link)**
2. Customize the HTML template with your branding
3. Subject: `Verify your email for MyYoga.Guru`
4. Save changes

## Step 7: Test the Setup

### Test Expert Signup:

1. Go to `/auth/expert-signup`
2. Enter the expert signup code
3. Complete Auth0 signup/login
4. Verify email if needed
5. **Expected**: You should be redirected to `/srv` (Expert Portal)
6. **Verify**: Check Auth0 Dashboard → Users → Your User → app_metadata shows `"role": "expert"`

### Test Learner Signup:

1. Go to `/auth/login` (or click "Sign Up" on homepage)
2. Complete Auth0 signup/login
3. Verify email if needed
4. **Expected**: You should be redirected to `/app` (Learner Dashboard)
5. **Verify**: Check Auth0 app_metadata shows `"role": "learner"`

### Test Existing Users:

1. Log out
2. Log back in
3. **Expected**:
   - Experts → `/srv`
   - Learners → `/app`
4. **Verify**: Role persists from app_metadata

## Troubleshooting

### Issue: Users always get "learner" role

**Possible causes:**

1. Action secret mismatch between Auth0 and your app
2. API endpoint not accessible from Auth0 servers
3. auth_token not being passed correctly

**Debug steps:**

1. Check Auth0 Action logs: Dashboard → Monitoring → Logs → Filter by "Post Login"
2. Look for `[Auth0 Action]` log entries
3. Verify the API response in logs
4. Check your app logs for `[DBG][pending-auth-api]` entries

### Issue: Role not appearing in token

**Possible cause:** Non-namespaced claims

Auth0 silently drops custom claims that don't use a namespace URL. Make sure your Action uses:

```javascript
api.idToken.setCustomClaim('https://myyoga.guru/role', role); // ✅ Correct
api.idToken.setCustomClaim('role', role); // ❌ May be dropped
```

### Issue: Redirect not working

**Remember:** Redirects are handled by the callback route (`/auth/callback`), not by the Auth0 Action.

Check:

1. The callback route is reading the role correctly (check logs for `[DBG][auth/callback]`)
2. The namespaced claim `https://myyoga.guru/role` is present in the token

### Issue: Email verification breaks the flow

This should not happen because:

- Role is stored in Auth0 `app_metadata` before email verification
- On subsequent logins (after verification), role is read from `app_metadata`
- The callback route handles redirects based on the role in the token

If it still breaks, check:

1. Auth0 Action logs show role being set in `app_metadata`
2. After verification, the Action logs show role being read from `app_metadata`

## How It Works (Flow Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│ EXPERT SIGNUP FLOW                                              │
└─────────────────────────────────────────────────────────────────┘

1. User visits /auth/expert-signup
   ↓
2. Enters expert code → POST /auth/expert-signup/validate
   - Validates code against EXPERT_SIGNUP_CODE
   - Creates PendingAuth(role: 'expert', TTL: 30min)
   - Returns authToken
   ↓
3. Frontend redirects to /auth/login?auth_token={authToken}
   ↓
4. GET /auth/login route handler
   - Sets pending_auth_token cookie (backup)
   - Adds authToken to Auth0 returnTo
   - Redirects to Auth0 for authentication
   ↓
5. User completes Auth0 signup/login
   - May need to verify email
   ↓
6. Auth0 Post-Login Action runs
   - Extracts auth_token from returnTo
   - Calls /api/auth/pending-auth/{authToken}
   - Gets role: 'expert' from PendingAuth
   - Sets app_metadata.role = 'expert'
   - Adds https://myyoga.guru/role = 'expert' to token
   ↓
7. GET /auth/callback processes
   - Reads role from namespaced token claim
   - Calls getOrCreateUser() with role='expert'
   - Creates User in MongoDB with role='expert'
   - Sends expert welcome email (if new user)
   - Redirects to /srv
   ↓
8. User lands on /srv (Expert Portal)
   ✓ Role: expert
   ✓ Welcome email sent


┌─────────────────────────────────────────────────────────────────┐
│ LEARNER SIGNUP FLOW                                             │
└─────────────────────────────────────────────────────────────────┘

1. User visits /auth/login or clicks "Sign Up"
   ↓
2. GET /auth/login route handler
   - Creates PendingAuth(role: 'learner', TTL: 30min)
   - Redirects to Auth0 for authentication
   ↓
3. User completes Auth0 signup/login
   - May need to verify email
   ↓
4. Auth0 Post-Login Action runs
   - Gets role: 'learner' from PendingAuth (or defaults)
   - Sets app_metadata.role = 'learner'
   - Adds https://myyoga.guru/role = 'learner' to token
   ↓
5. GET /auth/callback processes
   - Reads role from namespaced token claim
   - Creates User in MongoDB with role='learner'
   - Sends learner welcome email (if new user)
   - Redirects to /app
   ↓
6. User lands on /app (Learner Dashboard)
   ✓ Role: learner
   ✓ Welcome email sent


┌─────────────────────────────────────────────────────────────────┐
│ EXISTING USER LOGIN                                             │
└─────────────────────────────────────────────────────────────────┘

1. User visits /auth/login
   ↓
2. Auth0 Post-Login Action runs
   - Finds existing role in app_metadata
   - Uses that role (no API call needed)
   - Adds role to token
   ↓
3. Callback redirects to appropriate dashboard
   - Experts → /srv
   - Learners → /app
```

## Key Benefits

- **Survives email verification**: Role stored in Auth0 app_metadata before verification
- **Namespaced claims**: Role reliably available in JWT tokens
- **App-controlled redirects**: More reliable, easier to debug
- **Welcome emails**: Role-specific emails sent on first signup
- **Single source of truth**: Auth0 app_metadata is authoritative for roles

## Support

If you encounter issues:

1. Check Auth0 Dashboard → Monitoring → Logs
2. Check your application logs for `[DBG][auth/callback]` entries
3. Verify secrets match between Auth0 and your app
4. Ensure your API endpoint is publicly accessible from Auth0 servers
