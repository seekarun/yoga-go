/**
 * POST /api/auth/cognito/verify
 * Verify email with confirmation code and auto-login
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import {
  confirmSignUp,
  signIn,
  getUserInfo,
  getCognitoErrorMessage,
  isCognitoError,
} from '@/lib/cognito-auth';
import { getOrCreateUser } from '@/lib/auth';
import { encode } from 'next-auth/jwt';

interface VerifyRequestBody {
  email: string;
  code: string;
  password?: string; // Optional: for auto-login after verification
}

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

          // Check for pending auth to get role
          await connectToDatabase();
          const pendingAuth = await PendingAuth.findById(userInfo.sub);
          const role = pendingAuth?.role || 'learner';

          // Create or update MongoDB user
          const user = await getOrCreateUser(
            {
              sub: userInfo.sub,
              email: userInfo.email,
              name: userInfo.name || '',
            },
            role
          );

          console.log('[DBG][verify] Created/updated user:', user.id, 'role:', role);

          // Delete pending auth
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

          // Create response with session cookie
          const response = NextResponse.json({
            success: true,
            message: 'Email verified and logged in successfully.',
            user: {
              id: user.id,
              email: user.profile.email,
              name: user.profile.name,
              role: user.role,
            },
            redirectUrl: role === 'expert' ? '/srv' : '/app',
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
        }
      } catch (signInError) {
        console.error('[DBG][verify] Auto-login failed:', signInError);
        // Verification succeeded but auto-login failed
        // User can manually login
      }
    }

    // Verification successful but no auto-login
    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. Please sign in.',
      redirectUrl: '/auth/signin',
    });
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
