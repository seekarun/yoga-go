/**
 * Auth Callback Handler
 *
 * This route processes the auth_token parameter after OAuth completes.
 * With NextAuth, the OAuth callback is handled by /api/auth/callback/cognito.
 * This route handles the post-auth user creation with role assignment.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import { getOrCreateUser } from '@/lib/auth';
import type { UserRole } from '@/types';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/callback] Processing auth callback');

  try {
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    // Get the current session
    const session = await auth();

    console.log('[DBG][auth/callback] Session:', session ? 'exists' : 'null');

    if (!session?.user) {
      console.log('[DBG][auth/callback] No session, redirecting to login');
      return NextResponse.redirect(new URL('/auth/login', baseUrl));
    }

    console.log('[DBG][auth/callback] User:', session.user.cognitoSub);

    // Extract auth_token from query params
    const searchParams = request.nextUrl.searchParams;
    const authToken = searchParams.get('auth_token');
    const redirectTo = searchParams.get('redirectTo') || '/app';

    let role: UserRole = 'learner';

    if (authToken) {
      console.log('[DBG][auth/callback] Auth token found:', authToken);

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

    console.log('[DBG][auth/callback] Creating/updating user with role:', role);

    // Create or update user in MongoDB
    await getOrCreateUser(
      {
        sub: session.user.cognitoSub!,
        email: session.user.email!,
        name: session.user.name || undefined,
        picture: session.user.image || undefined,
      },
      role
    );

    console.log('[DBG][auth/callback] User created/updated successfully');

    // Redirect to the intended destination
    return NextResponse.redirect(new URL(redirectTo, baseUrl));
  } catch (error) {
    console.error('[DBG][auth/callback] Error:', error);
    throw error;
  }
}
