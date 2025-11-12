/**
 * Custom Auth0 Login Handler
 *
 * Supports two flows:
 * 1. New flow: auth_token parameter (from expert signup page)
 * 2. Legacy flow: role + code parameters (backward compatibility)
 *
 * Stores the intended role in MongoDB temporarily and redirects to Auth0 SDK's login.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';

export async function GET(request: NextRequest) {
  console.log('[DBG][auth/login] Auth0 login handler');

  try {
    // Get the current hostname
    const hostname = request.headers.get('host') || 'localhost:3111';
    const protocol = hostname.includes('localhost') ? 'http' : 'https';

    console.log('[DBG][auth/login] Hostname:', hostname);

    // Check for parameters
    const searchParams = request.nextUrl.searchParams;
    const authTokenParam = searchParams.get('auth_token');
    const roleParam = searchParams.get('role');
    const codeParam = searchParams.get('code');

    let authToken: string;

    // Priority 1: Use existing auth_token if provided (from expert signup page)
    if (authTokenParam) {
      console.log('[DBG][auth/login] Using existing auth_token:', authTokenParam);
      await connectToDatabase();

      const pendingAuth = await PendingAuth.findById(authTokenParam);

      if (!pendingAuth) {
        console.log('[DBG][auth/login] No pending auth found for token:', authTokenParam);
        return NextResponse.redirect(new URL('/invite-invalid', `${protocol}://${hostname}`));
      }

      if (pendingAuth.expiresAt < new Date()) {
        console.log('[DBG][auth/login] Pending auth expired for token:', authTokenParam);
        await PendingAuth.findByIdAndDelete(authTokenParam);
        return NextResponse.redirect(new URL('/invite-invalid', `${protocol}://${hostname}`));
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
          return NextResponse.redirect(new URL('/invite-invalid', `${protocol}://${hostname}`));
        }

        if (codeParam !== expectedCode) {
          console.log('[DBG][auth/login] Invalid expert signup code provided');
          return NextResponse.redirect(new URL('/invite-invalid', `${protocol}://${hostname}`));
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

    // Construct returnTo URL with the auth token
    const returnToUrl = `/app?auth_token=${authToken}`;

    console.log('[DBG][auth/login] Redirecting to Auth0');
    console.log('[DBG][auth/login] ReturnTo:', returnToUrl);

    // Add returnTo to the request URL for Auth0 SDK
    request.nextUrl.searchParams.set('returnTo', returnToUrl);

    // Let Auth0 SDK handle the login flow
    const { auth0 } = await import('@/lib/auth0');
    return await auth0.middleware(request);
  } catch (error) {
    console.error('[DBG][auth/login] Error:', error);
    throw error;
  }
}
