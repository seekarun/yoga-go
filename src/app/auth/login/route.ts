/**
 * Custom Cognito Login Handler
 *
 * Supports two flows:
 * 1. New flow: auth_token parameter (from expert signup page)
 * 2. Legacy flow: role + code parameters (backward compatibility)
 *
 * Stores the intended role in MongoDB temporarily and redirects to Cognito via NextAuth.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import { signIn } from '@/auth';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/login] Cognito login handler');

  try {
    // Get the current hostname
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${hostname}`;

    console.log('[DBG][auth/login] Hostname:', hostname);

    // Check for parameters
    const searchParams = request.nextUrl.searchParams;
    const authTokenParam = searchParams.get('auth_token');
    const roleParam = searchParams.get('role');
    const codeParam = searchParams.get('code');
    const callbackUrl = searchParams.get('callbackUrl');

    let authToken: string;

    // Priority 1: Use existing auth_token if provided (from expert signup page)
    if (authTokenParam) {
      console.log('[DBG][auth/login] Using existing auth_token:', authTokenParam);
      await connectToDatabase();

      const pendingAuth = await PendingAuth.findById(authTokenParam);

      if (!pendingAuth) {
        console.log('[DBG][auth/login] No pending auth found for token:', authTokenParam);
        return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
      }

      if (pendingAuth.expiresAt < new Date()) {
        console.log('[DBG][auth/login] Pending auth expired for token:', authTokenParam);
        await PendingAuth.findByIdAndDelete(authTokenParam);
        return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
      }

      authToken = authTokenParam;
      console.log('[DBG][auth/login] Found valid pending auth with role:', pendingAuth.role);
    }
    // Priority 2: Legacy flow - validate code directly (backward compatibility)
    else {
      let role: 'learner' | 'expert' = 'learner'; // Default role

      // If role=expert is requested, validate the secret code
      if (roleParam === 'expert') {
        console.log('[DBG][auth/login] Expert signup requested (legacy flow), validating code...');

        const expectedCode = process.env.EXPERT_SIGNUP_CODE;

        if (!expectedCode) {
          console.error('[DBG][auth/login] EXPERT_SIGNUP_CODE not configured in environment!');
          return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
        }

        if (codeParam !== expectedCode) {
          console.log('[DBG][auth/login] Invalid expert signup code provided');
          return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
        }

        console.log('[DBG][auth/login] Expert signup code validated successfully');
        role = 'expert'; // User will be created as expert
      }

      // Store role in MongoDB with auto-expiry
      await connectToDatabase();
      const pendingAuth = await PendingAuth.create({
        role,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      });

      authToken = pendingAuth._id as string;

      console.log('[DBG][auth/login] Created pending auth:', authToken, 'role:', role);
    }

    // Construct redirect URL to go through /auth/callback for proper user creation
    // The callback route will process the auth_token and create the user with the correct role
    const finalDestination = callbackUrl || '/app';
    const redirectUrl = `/auth/callback?auth_token=${authToken}&redirectTo=${encodeURIComponent(finalDestination)}`;

    console.log('[DBG][auth/login] Redirecting to Cognito via NextAuth');
    console.log('[DBG][auth/login] Redirect URL after auth:', redirectUrl);

    // Use NextAuth's signIn to redirect to Cognito
    return signIn('cognito', { redirectTo: redirectUrl });
  } catch (error) {
    console.error('[DBG][auth/login] Error:', error);
    throw error;
  }
}
