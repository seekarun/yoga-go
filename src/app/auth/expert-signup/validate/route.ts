/**
 * Expert Signup Code Validation API
 *
 * Validates expert signup code and creates a PendingAuth record.
 * Returns auth token for use in the login flow.
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { PendingAuth } from '@/models/PendingAuth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ success: false, error: 'Code is required' }, { status: 400 });
    }

    const expectedCode = process.env.EXPERT_SIGNUP_CODE;

    if (!expectedCode) {
      console.error('[expert-signup/validate] EXPERT_SIGNUP_CODE not configured');
      return NextResponse.json(
        { success: false, error: 'Expert signup is not configured' },
        { status: 500 }
      );
    }

    if (code.trim().toUpperCase() !== expectedCode.toUpperCase()) {
      return NextResponse.json(
        { success: false, error: 'Invalid expert signup code' },
        { status: 401 }
      );
    }

    await connectToDatabase();

    const pendingAuth = await PendingAuth.create({
      role: 'expert',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    });

    const authToken = pendingAuth._id;

    const response = NextResponse.json({
      success: true,
      authToken,
    });

    response.cookies.set('pending_auth_token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('[expert-signup/validate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during validation' },
      { status: 500 }
    );
  }
}
