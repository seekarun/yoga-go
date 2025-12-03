/**
 * POST /api/auth/cognito/resend-code
 * Resend verification code to user's email
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { resendConfirmationCode, getCognitoErrorMessage } from '@/lib/cognito-auth';

interface ResendCodeRequestBody {
  email: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ResendCodeRequestBody = await request.json();
    const { email } = body;

    // Validate required fields
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email is required.' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    console.log('[DBG][resend-code] Resending verification code to:', normalizedEmail);

    // Resend confirmation code
    const result = await resendConfirmationCode({
      email: normalizedEmail,
    });

    console.log('[DBG][resend-code] Result:', result);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
    });
  } catch (error) {
    console.error('[DBG][resend-code] Error:', error);

    const message = getCognitoErrorMessage(error);
    return NextResponse.json({ success: false, message }, { status: 400 });
  }
}
