/**
 * POST /api/auth/cognito/signup
 * Register a new user with Cognito
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { signUp, getCognitoErrorMessage, isCognitoError } from '@/lib/cognito-auth';
import { SignJWT } from 'jose';
import type { UserRole } from '@/types';

interface SignupRequestBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
  roles?: UserRole[]; // New: roles array
  role?: UserRole; // Legacy: single role
  signupExpertId?: string; // Expert ID from subdomain signup
}

// Cookie name for pending signup data
const PENDING_SIGNUP_COOKIE = 'pending-signup';

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequestBody = await request.json();
    const { email, password, name, phone, roles, role, signupExpertId } = body;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, password, and name are required.' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Validate password length (Cognito requires 8+)
    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          message: 'Password must be at least 8 characters.',
        },
        { status: 400 }
      );
    }

    console.log('[DBG][signup] Attempting signup for:', email);

    // Sign up with Cognito
    const result = await signUp({
      email: email.toLowerCase().trim(),
      password,
      name: name.trim(),
      phone: phone?.trim(),
    });

    console.log('[DBG][signup] Cognito signup result:', {
      success: result.success,
      userSub: result.userSub,
      requiresVerification: result.requiresVerification,
    });

    // Determine user roles array
    let userRoles: UserRole[] = ['learner']; // Default

    if (roles && roles.length > 0) {
      // Use provided roles array
      userRoles = roles;
    } else if (role) {
      // Legacy: single role provided
      userRoles = role === 'expert' ? ['learner', 'expert'] : ['learner'];
    }

    // Create response
    const response = NextResponse.json({
      success: true,
      message: result.message,
      email: email.toLowerCase().trim(),
      requiresVerification: result.requiresVerification,
      userSub: result.userSub,
    });

    // Store roles in a signed cookie for verification callback (instead of MongoDB PendingAuth)
    if (result.requiresVerification && result.userSub) {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

      // Create a signed JWT with the pending signup data
      const signedToken = await new SignJWT({
        sub: result.userSub,
        roles: userRoles,
        email: email.toLowerCase().trim(),
        signupExpertId: signupExpertId || undefined,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('30m') // 30 minutes expiry
        .setIssuedAt()
        .sign(secret);

      // Set cookie with pending signup data
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
        maxAge: 30 * 60, // 30 minutes
      };

      // Set domain for production
      if (process.env.NODE_ENV === 'production') {
        cookieOptions.domain = '.myyoga.guru';
      }

      response.cookies.set(PENDING_SIGNUP_COOKIE, signedToken, cookieOptions);

      console.log(
        '[DBG][signup] Set pending-signup cookie for:',
        result.userSub,
        'roles:',
        userRoles,
        'signupExpertId:',
        signupExpertId || 'none'
      );
    }

    return response;
  } catch (error) {
    console.error('[DBG][signup] Error:', error);

    // Handle user already exists - provide helpful message
    if (isCognitoError(error, 'UsernameExistsException')) {
      return NextResponse.json(
        {
          success: false,
          message: 'An account with this email already exists. Please sign in instead.',
          code: 'USER_EXISTS',
        },
        { status: 409 }
      );
    }

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
