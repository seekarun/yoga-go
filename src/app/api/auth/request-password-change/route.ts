import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createPasswordChangeTicket } from '@/lib/auth0-management';

/**
 * POST /api/auth/request-password-change
 *
 * Creates a password change ticket for the authenticated user.
 * This generates a secure, time-limited URL that redirects to Auth0's password change page.
 *
 * @returns Password change ticket URL
 */
export async function POST() {
  try {
    const session = await getSession();

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user signed up with social provider (Google, Twitter, etc.)
    // Social login users don't have Auth0 database passwords
    const provider = session.user.sub.split('|')[0];

    if (provider !== 'auth0') {
      return NextResponse.json(
        {
          success: false,
          error: 'social_provider',
          message:
            'You signed in with a social provider. Please manage your password through that provider.',
        },
        { status: 400 }
      );
    }

    // Create password change ticket with intermediate redirect page
    // After password change, user goes to /password-success which immediately redirects to profile
    const result = await createPasswordChangeTicket(
      session.user.sub,
      `${process.env.AUTH0_BASE_URL}/app/profile/password-success`
    );

    return NextResponse.json({
      success: true,
      data: { ticketUrl: result.ticket },
    });
  } catch (error) {
    console.error('[auth-api] Password change ticket error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create password change ticket',
      },
      { status: 500 }
    );
  }
}
