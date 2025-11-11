/**
 * Auth0 Callback Handler
 *
 * Handles OAuth callback from Auth0 and assigns user roles based on database storage.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth0 } from '@/lib/auth0';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import { getOrCreateUser } from '@/lib/auth';
import type { UserRole } from '@/types';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/callback] Processing Auth0 callback');

  try {
    // Let Auth0 SDK handle the OAuth callback first
    const callbackResponse = await auth0.middleware(request);

    console.log('[DBG][auth/callback] Auth0 middleware processed');

    // Get the session to extract user info
    const session = await auth0.getSession(request);

    console.log('[DBG][auth/callback] Session:', session ? 'exists' : 'null');

    if (session?.user) {
      console.log('[DBG][auth/callback] User:', session.user.sub);
      console.log('[DBG][auth/callback] User data:', {
        sub: session.user.sub,
        email: session.user.email,
        name: session.user.name,
        picture: session.user.picture,
      });

      // Extract auth_token from the redirect location
      const location = callbackResponse.headers.get('location');
      console.log('[DBG][auth/callback] Redirect location:', location);

      let role: UserRole = 'learner';

      if (location) {
        const redirectUrl = new URL(location, request.url);
        const authToken = redirectUrl.searchParams.get('auth_token');

        console.log('[DBG][auth/callback] Auth token from returnTo:', authToken);

        if (authToken) {
          // Look up role from MongoDB
          await connectToDatabase();
          const pendingAuth = await PendingAuth.findById(authToken);

          if (pendingAuth) {
            role = pendingAuth.role;
            console.log('[DBG][auth/callback] Retrieved role from database:', role);

            // Delete the pending auth record (one-time use)
            await PendingAuth.findByIdAndDelete(authToken);
            console.log('[DBG][auth/callback] Deleted pending auth record');
          } else {
            console.log('[DBG][auth/callback] No pending auth found for token:', authToken);
          }
        }
      }

      console.log('[DBG][auth/callback] Creating/updating user with role:', role);

      // Create or update user in MongoDB
      await getOrCreateUser(
        {
          sub: session.user.sub,
          email: session.user.email!,
          name: session.user.name,
          picture: session.user.picture,
        },
        role
      );

      console.log('[DBG][auth/callback] User created/updated successfully');
    }

    // Return the Auth0 callback response (includes redirect)
    return callbackResponse;
  } catch (error) {
    console.error('[DBG][auth/callback] Error:', error);
    throw error;
  }
}
