import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  createPendingVerification,
  isEmailOnWaitlist,
} from '@/lib/repositories/waitlistRepository';
import { sendEmail } from '@/lib/email';

/**
 * POST /api/waitlist/signup
 * Send verification PIN to email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log('[DBG][waitlist/signup] Signup request for:', email);

    // Validate email
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'Email is required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if already on waitlist
    const alreadySignedUp = await isEmailOnWaitlist(normalizedEmail);
    if (alreadySignedUp) {
      return NextResponse.json(
        { success: false, message: 'This email is already on our waitlist!' },
        { status: 400 }
      );
    }

    // Create pending verification and get PIN
    const pin = await createPendingVerification(normalizedEmail);

    // Send verification email
    await sendEmail({
      to: normalizedEmail,
      subject: 'Verify your email - MyYoga.Guru',
      text: `Your verification code is: ${pin}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this, please ignore this email.`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: var(--color-primary, #7a2900); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">MyYoga.Guru</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="font-size: 22px; color: #1a1a1a; margin: 0 0 16px 0; text-align: center;">
                Verify your email
              </h2>

              <p style="font-size: 16px; color: #666; margin: 0 0 30px 0; text-align: center; line-height: 1.5;">
                Enter this code to complete your waitlist signup:
              </p>

              <!-- PIN Box -->
              <div style="background: #f8f8f8; border: 2px dashed #ddd; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #7a2900; font-family: monospace;">
                  ${pin}
                </span>
              </div>

              <p style="font-size: 14px; color: #888; margin: 0; text-align: center;">
                This code expires in 10 minutes.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f8f8; padding: 20px; text-align: center; border-top: 1px solid #eee;">
              <p style="margin: 0; font-size: 12px; color: #999;">
                If you didn't request this, please ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log('[DBG][waitlist/signup] Verification email sent to:', normalizedEmail);

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
    });
  } catch (error) {
    console.error('[DBG][waitlist/signup] Error:', error);
    // Log more details for debugging
    if (error instanceof Error) {
      console.error('[DBG][waitlist/signup] Error name:', error.name);
      console.error('[DBG][waitlist/signup] Error message:', error.message);
      console.error('[DBG][waitlist/signup] Error stack:', error.stack);
    }
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to process signup. Please try again.',
        // Include error details in development
        ...(process.env.NODE_ENV === 'development' && {
          debug: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}
