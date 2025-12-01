/**
 * POST /api/auth/cognito/signup
 * Register a new user with Cognito
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';
import { signUp, getCognitoErrorMessage, isCognitoError } from '@/lib/cognito-auth';
import type { UserRole } from '@/types';

interface SignupRequestBody {
  email: string;
  password: string;
  name: string;
  phone?: string;
  roles?: UserRole[]; // New: roles array
  role?: UserRole; // Legacy: single role
  authToken?: string; // From expert signup flow
}

export async function POST(request: NextRequest) {
  try {
    const body: SignupRequestBody = await request.json();
    const { email, password, name, phone, roles, role, authToken } = body;

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

    // If authToken provided (from expert signup), verify and get role
    if (authToken) {
      await connectToDatabase();
      const pendingAuth = await PendingAuth.findById(authToken);
      if (pendingAuth && pendingAuth.role) {
        // Use roles from pending auth (could be array or legacy string)
        userRoles = Array.isArray(pendingAuth.role) ? pendingAuth.role : [pendingAuth.role];
        // Delete the old pending auth (it was for the code validation step)
        await PendingAuth.deleteOne({ _id: authToken });
      }
    } else if (roles && roles.length > 0) {
      // Use provided roles array
      userRoles = roles;
    } else if (role) {
      // Legacy: single role provided
      userRoles = role === 'expert' ? ['learner', 'expert'] : ['learner'];
    }

    // Create new PendingAuth to store roles for verification callback
    if (result.requiresVerification && result.userSub) {
      await connectToDatabase();
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await PendingAuth.create({
        _id: result.userSub, // Use Cognito sub as ID for easy lookup
        role: userRoles,
        expiresAt,
      });

      console.log('[DBG][signup] Created PendingAuth for:', result.userSub, 'roles:', userRoles);
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      email: email.toLowerCase().trim(),
      requiresVerification: result.requiresVerification,
      userSub: result.userSub,
    });
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
