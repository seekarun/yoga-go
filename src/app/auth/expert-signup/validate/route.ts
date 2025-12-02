/**
 * Expert Signup Code Validation API
 *
 * Validates expert signup code and creates a signed cookie with expert role.
 * Returns success status for use in the signup flow.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';

// Cookie name for pending OAuth auth data
const PENDING_OAUTH_COOKIE = 'pending-oauth-role';

export async function POST(request: NextRequest) {
  console.log('[DBG][expert-signup/validate] Validating expert code');

  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    // Validate against environment variable
    const expectedCode = process.env.EXPERT_SIGNUP_CODE;

    if (!expectedCode) {
      console.error('[DBG][expert-signup/validate] EXPERT_SIGNUP_CODE not configured!');
      return NextResponse.json(
        { success: false, error: 'Expert signup is not configured' },
        { status: 500 }
      );
    }

    if (code.trim().toUpperCase() !== expectedCode.toUpperCase()) {
      console.log('[DBG][expert-signup/validate] Invalid code provided');
      return NextResponse.json(
        { success: false, error: 'Invalid expert signup code' },
        { status: 401 }
      );
    }

    console.log('[DBG][expert-signup/validate] Code validated successfully');

    // Create signed cookie with expert role (instead of MongoDB PendingAuth)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    const signedToken = await new SignJWT({
      roles: ['learner', 'expert'], // Expert users also have learner role
      validated: true,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('10m') // 10 minutes expiry
      .setIssuedAt()
      .sign(secret);

    const response = NextResponse.json({
      success: true,
      message: 'Expert code validated successfully',
    });

    // Set cookie with pending OAuth role
    const cookieOptions: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax' | 'strict' | 'none';
      path: string;
      maxAge: number;
      domain?: string;
    } = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 10 * 60, // 10 minutes
    };

    // Set domain for production
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.domain = '.myyoga.guru';
    }

    response.cookies.set(PENDING_OAUTH_COOKIE, signedToken, cookieOptions);

    console.log('[DBG][expert-signup/validate] Set pending-oauth-role cookie');

    return response;
  } catch (error) {
    console.error('[DBG][expert-signup/validate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during validation' },
      { status: 500 }
    );
  }
}
