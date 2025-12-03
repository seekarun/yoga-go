/**
 * POST /api/auth/cognito/verify
 * Verify email with confirmation code and auto-login
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  confirmSignUp,
  signIn,
  getUserInfo,
  getCognitoErrorMessage,
  isCognitoError,
} from '@/lib/cognito-auth';
import { getOrCreateUser } from '@/lib/auth';
import { encode } from 'next-auth/jwt';
import { jwtVerify } from 'jose';
import type { UserRole } from '@/types';

interface VerifyRequestBody {
  email: string;
  code: string;
  password?: string; // Optional: for auto-login after verification
}

// Cookie name for pending signup data (must match signup route)
const PENDING_SIGNUP_COOKIE = 'pending-signup';

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequestBody = await request.json();
    const { email, code, password } = body;

    // Validate required fields
    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email and verification code are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[DBG][verify] Attempting verification for:', normalizedEmail);

    // Confirm signup with Cognito
    const confirmResult = await confirmSignUp({
      email: normalizedEmail,
      code: code.trim(),
    });

    console.log('[DBG][verify] Confirmation result:', confirmResult);

    // If password provided, auto-login and create session
    if (password) {
      try {
        const signInResult = await signIn({
          email: normalizedEmail,
          password,
        });

        if (signInResult.success && signInResult.accessToken) {
          // Get user info from Cognito
          const userInfo = await getUserInfo({
            accessToken: signInResult.accessToken,
          });

          console.log('[DBG][verify] Got user info:', {
            sub: userInfo.sub,
            email: userInfo.email,
            name: userInfo.name,
          });

          // Get roles from the signed cookie (instead of MongoDB PendingAuth)
          let roles: UserRole[] = ['learner']; // Default
          const pendingSignupCookie = request.cookies.get(PENDING_SIGNUP_COOKIE);

          if (pendingSignupCookie?.value) {
            try {
              const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
              const { payload } = await jwtVerify(pendingSignupCookie.value, secret);

              // Verify this cookie is for the same user
              if (payload.sub === userInfo.sub && payload.roles) {
                roles = payload.roles as UserRole[];
                console.log('[DBG][verify] Got roles from cookie:', roles);
              }
            } catch (cookieError) {
              console.error('[DBG][verify] Error reading pending-signup cookie:', cookieError);
              // Continue with default role
            }
          }

          // Create or update DynamoDB user with roles array
          const user = await getOrCreateUser(
            {
              sub: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name || '',
            },
            roles
          );

          console.log('[DBG][verify] Created/updated user:', user.id, 'roles:', roles);

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

          // Create response with session cookie
          // Redirect to /srv if user has expert role, otherwise /app
          const isExpert = roles.includes('expert');
          const response = NextResponse.json({
            success: true,
            message: 'Email verified and logged in successfully.',
            user: {
              id: user.id,
              email: user.profile.email,
              name: user.profile.name,
              role: user.role,
            },
            redirectUrl: isExpert ? '/srv' : '/app',
          });

          // Set the session cookie
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

          // Set domain for production to work across www.myyoga.guru and myyoga.guru
          if (process.env.NODE_ENV === 'production') {
            cookieOptions.domain = '.myyoga.guru';
          }

          response.cookies.set('authjs.session-token', token, cookieOptions);

          // Delete the pending-signup cookie
          response.cookies.delete(PENDING_SIGNUP_COOKIE);

          return response;
        }
      } catch (signInError) {
        console.error('[DBG][verify] Auto-login failed:', signInError);
        // Verification succeeded but auto-login failed
        // User can manually login
      }
    }

    // Verification successful but no auto-login
    const response = NextResponse.json({
      success: true,
      message: 'Email verified successfully. Please sign in.',
      redirectUrl: '/auth/signin',
    });

    // Delete the pending-signup cookie even if no auto-login
    response.cookies.delete(PENDING_SIGNUP_COOKIE);

    return response;
  } catch (error) {
    console.error('[DBG][verify] Error:', error);

    if (isCognitoError(error, 'CodeMismatchException')) {
      return NextResponse.json(
        { success: false, message: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    if (isCognitoError(error, 'ExpiredCodeException')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Verification code has expired. Please request a new one.',
          code: 'CODE_EXPIRED',
        },
        { status: 400 }
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
