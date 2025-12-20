import { NextRequest, NextResponse } from 'next/server';
import {
  getPendingVerification,
  deletePendingVerification,
  createWaitlistSignup,
  isEmailOnWaitlist,
} from '@/lib/repositories/waitlistRepository';

/**
 * POST /api/waitlist/verify
 * Verify PIN and save waitlist signup
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, pin, name, thoughts } = body;

    console.log('[DBG][waitlist/verify] Verify request for:', email);

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Verification code is required' },
        { status: 400 }
      );
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ success: false, message: 'Name is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if already on waitlist
    const alreadySignedUp = await isEmailOnWaitlist(normalizedEmail);
    if (alreadySignedUp) {
      return NextResponse.json(
        { success: false, message: 'This email is already on our waitlist!' },
        { status: 400 }
      );
    }

    // Get pending verification
    const pending = await getPendingVerification(normalizedEmail);

    if (!pending) {
      return NextResponse.json(
        {
          success: false,
          message: 'Verification code expired or not found. Please request a new code.',
          expired: true,
        },
        { status: 400 }
      );
    }

    // Verify PIN
    if (pending.pin !== pin.trim()) {
      console.log('[DBG][waitlist/verify] Invalid PIN for:', normalizedEmail);
      return NextResponse.json(
        { success: false, message: 'Invalid verification code. Please try again.' },
        { status: 400 }
      );
    }

    // PIN is valid - create waitlist signup
    const signup = await createWaitlistSignup(normalizedEmail, name, thoughts || '');

    // Delete pending verification
    await deletePendingVerification(normalizedEmail);

    console.log('[DBG][waitlist/verify] Waitlist signup completed for:', normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Welcome to the waitlist!',
      data: {
        email: signup.email,
        name: signup.name,
      },
    });
  } catch (error) {
    console.error('[DBG][waitlist/verify] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify. Please try again.' },
      { status: 500 }
    );
  }
}
