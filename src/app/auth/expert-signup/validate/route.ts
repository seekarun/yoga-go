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

    // Create PendingAuth record with expert role
    await connectToDatabase();
    const pendingAuth = await PendingAuth.create({
      role: 'expert',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });

    const authToken = pendingAuth._id;

    console.log('[DBG][expert-signup/validate] Created pending auth:', authToken);

    return NextResponse.json({
      success: true,
      authToken,
    });
  } catch (error) {
    console.error('[DBG][expert-signup/validate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'An error occurred during validation' },
      { status: 500 }
    );
  }
}
