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
import { getBaseUrlFromRequest } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const baseUrl = getBaseUrlFromRequest(request);

    const searchParams = request.nextUrl.searchParams;
    const authTokenParam = searchParams.get('auth_token');
    const roleParam = searchParams.get('role');
    const codeParam = searchParams.get('code');

    let authToken: string = '';

    // Check for existing pending_auth_token cookie (preserved through email verification)
    const existingCookieToken = request.cookies.get('pending_auth_token')?.value;

    // Priority 1: Use existing auth_token if provided (from expert signup page)
    if (authTokenParam) {
      await connectToDatabase();
      const pendingAuth = await PendingAuth.findById(authTokenParam);

      if (!pendingAuth) {
        return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
      }

      if (pendingAuth.expiresAt < new Date()) {
        await PendingAuth.findByIdAndDelete(authTokenParam);
        return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
      }

      authToken = authTokenParam;
    }
    // Priority 2: Use existing cookie token (preserved through email verification flow)
    else if (existingCookieToken) {
      await connectToDatabase();
      const pendingAuth = await PendingAuth.findById(existingCookieToken);

      if (pendingAuth && pendingAuth.expiresAt > new Date()) {
        authToken = existingCookieToken;
      }
    }

    // Priority 3: Legacy flow or no existing token - create new PendingAuth
    if (!authToken) {
      let role: 'learner' | 'expert' = 'learner';

      // If role=expert is requested, validate the secret code
      if (roleParam === 'expert') {
        const expectedCode = process.env.EXPERT_SIGNUP_CODE;

        if (!expectedCode) {
          console.error('[auth/login] EXPERT_SIGNUP_CODE not configured');
          return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
        }

        if (codeParam?.toUpperCase() !== expectedCode.toUpperCase()) {
          return NextResponse.redirect(new URL('/invite-invalid', baseUrl));
        }

        role = 'expert';
      }

      await connectToDatabase();
      const pendingAuth = await PendingAuth.create({
        role,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      });

      authToken = pendingAuth._id as string;
    }

    // Add auth_token to returnTo so it comes back in callback
    const returnToUrl = `/auth/callback?auth_token=${authToken}`;
    request.nextUrl.searchParams.set('returnTo', returnToUrl);

    // Let Auth0 SDK handle the login flow
    const { auth0 } = await import('@/lib/auth0');
    const auth0Response = await auth0.middleware(request);

    // Set secure cookie to preserve auth_token through email verification
    auth0Response.cookies.set('pending_auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60, // 30 minutes
      path: '/',
    });

    return auth0Response;
  } catch (error) {
    console.error('[auth/login] Error:', error);
    throw error;
  }
}
