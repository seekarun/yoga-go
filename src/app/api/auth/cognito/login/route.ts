/**
 * POST /api/auth/cognito/login
 * Authenticate user with Cognito and create NextAuth session
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import { signIn, getUserInfo, getCognitoErrorMessage, isCognitoError } from '@/lib/cognito-auth';
import { getOrCreateUser } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

interface LoginRequestBody {
  email: string;
  password: string;
}

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

    // Check for pending auth (for users who just verified)
    await connectToDatabase();
    const pendingAuth = await PendingAuth.findById(userInfo.sub);
    const role = pendingAuth?.role;

    // Get or create MongoDB user
    const user = await getOrCreateUser(
      {
        sub: userInfo.sub,
        email: userInfo.email,
        name: userInfo.name || '',
      },
      role // Pass role if from pending auth, otherwise uses existing or default
    );

    console.log('[DBG][login] User from MongoDB:', user.id, 'role:', user.role);

    // Clean up pending auth if exists
    if (pendingAuth) {
      await PendingAuth.deleteOne({ _id: userInfo.sub });
    }

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

    // Determine redirect URL based on role
    const redirectUrl = user.role === 'expert' ? '/srv' : '/app';

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
    response.cookies.set('authjs.session-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

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
