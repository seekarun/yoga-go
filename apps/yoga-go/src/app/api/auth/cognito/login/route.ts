/**
 * POST /api/auth/cognito/login
 * Authenticate user with Cognito and create NextAuth session
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { signIn, getUserInfo, getCognitoErrorMessage, isCognitoError } from '@/lib/cognito-auth';
import { getOrCreateUser } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { jwtVerify } from 'jose';
import type { UserRole } from '@/types';
import { COOKIE_DOMAIN } from '@/config/env';

interface LoginRequestBody {
  email: string;
  password: string;
}

// Cookie name for pending signup data (must match signup route)
const PENDING_SIGNUP_COOKIE = 'pending-signup';

export async function POST(request: NextRequest) {
  // Log environment config at start (helps debug production issues)
  console.log('[DBG][login] ========== LOGIN ATTEMPT ==========');
  console.log('[DBG][login] COGNITO_CLIENT_ID set:', !!process.env.COGNITO_CLIENT_ID);
  console.log('[DBG][login] COGNITO_CLIENT_SECRET set:', !!process.env.COGNITO_CLIENT_SECRET);
  console.log('[DBG][login] AWS_REGION:', process.env.AWS_REGION);
  console.log('[DBG][login] COGNITO_USER_POOL_ID set:', !!process.env.COGNITO_USER_POOL_ID);
  console.log('[DBG][login] NEXTAUTH_SECRET set:', !!process.env.NEXTAUTH_SECRET);
  console.log('[DBG][login] NODE_ENV:', process.env.NODE_ENV);

  try {
    const body: LoginRequestBody = await request.json();
    const { email, password } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[DBG][login] Attempting login for:', normalizedEmail);

    // Authenticate with Cognito
    const signInResult = await signIn({
      email: normalizedEmail,
      password,
    });

    if (!signInResult.success || !signInResult.accessToken) {
      return NextResponse.json({ success: false, message: signInResult.message }, { status: 401 });
    }

    console.log('[DBG][login] Cognito authentication successful');

    // Get user info from Cognito
    const userInfo = await getUserInfo({
      accessToken: signInResult.accessToken,
    });

    console.log('[DBG][login] Got user info:', {
      sub: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name,
    });

    // Check for pending signup cookie (for users who just verified)
    let role: UserRole[] | undefined;
    const pendingSignupCookie = request.cookies.get(PENDING_SIGNUP_COOKIE);

    if (pendingSignupCookie?.value) {
      try {
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
        const { payload } = await jwtVerify(pendingSignupCookie.value, secret);

        // Verify this cookie is for the same user
        if (payload.sub === userInfo.sub && payload.roles) {
          role = payload.roles as UserRole[];
          console.log('[DBG][login] Got roles from pending-signup cookie:', role);
        }
      } catch (cookieError) {
        console.error('[DBG][login] Error reading pending-signup cookie:', cookieError);
        // Continue without role from cookie
      }
    }

    // Get or create DynamoDB user
    const user = await getOrCreateUser(
      {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || '',
      },
      role // Pass role if from pending signup cookie, otherwise uses existing or default
    );

    console.log('[DBG][login] User from DynamoDB:', user.id, 'role:', user.role);

    // Create NextAuth JWT token
    const token = await encode({
      token: {
        cognitoSub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name,
      },
      secret: process.env.NEXTAUTH_SECRET!,
      salt: 'authjs.session-token',
    });

    // Determine redirect URL based on role (role is now an array)
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    const redirectUrl = isExpert ? '/srv' : '/app';

    // Create response with session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.profile.email,
        name: user.profile.name,
        role: user.role,
      },
      redirectUrl,
    });

    // Set the session cookie
    // In production, set domain to work across subdomains
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
      maxAge: 30 * 24 * 60 * 60, // 30 days
    };

    // Set domain for production to work across subdomains
    if (COOKIE_DOMAIN) {
      cookieOptions.domain = COOKIE_DOMAIN;
    }

    response.cookies.set('authjs.session-token', token, cookieOptions);
    console.log('[DBG][login] Cookie set with options:', cookieOptions);

    // Clean up pending signup cookie if exists
    if (pendingSignupCookie) {
      response.cookies.delete(PENDING_SIGNUP_COOKIE);
    }

    return response;
  } catch (error) {
    console.error('[DBG][login] Error:', error);
    console.error('[DBG][login] Error name:', error instanceof Error ? error.name : 'unknown');
    console.error(
      '[DBG][login] Error message:',
      error instanceof Error ? error.message : String(error)
    );
    if (error && typeof error === 'object') {
      console.error('[DBG][login] Error keys:', Object.keys(error));
      if ('$metadata' in error) {
        console.error(
          '[DBG][login] Error metadata:',
          (error as Record<string, unknown>)['$metadata']
        );
      }
    }

    // Handle user not confirmed
    if (isCognitoError(error, 'UserNotConfirmedException')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Please verify your email before signing in.',
          code: 'USER_NOT_CONFIRMED',
          redirectUrl: '/auth/verify-email',
        },
        { status: 403 }
      );
    }

    // Handle incorrect credentials
    if (isCognitoError(error, 'NotAuthorizedException')) {
      return NextResponse.json(
        { success: false, message: 'Incorrect email or password.' },
        { status: 401 }
      );
    }

    // Handle user not found
    if (isCognitoError(error, 'UserNotFoundException')) {
      return NextResponse.json(
        { success: false, message: 'No account found with this email.' },
        { status: 404 }
      );
    }

    const message = getCognitoErrorMessage(error);
    const errorName =
      error && typeof error === 'object' && 'name' in error
        ? (error as { name: string }).name
        : 'Unknown';

    // Include error details for debugging (TODO: remove in production after debugging)
    const errorDetails = {
      errorName,
      errorMessage: error instanceof Error ? error.message : String(error),
    };

    console.error('[DBG][login] Final error response:', { message, ...errorDetails });

    return NextResponse.json({ success: false, message, ...errorDetails }, { status: 400 });
  }
}
