/**
 * Webinar Registration API Route
 * POST /data/app/webinars/[webinarId]/register - Register for a webinar (free webinars only)
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { registerUserForWebinar } from '@/lib/enrollment';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import { sendWebinarRegistrationEmail, getContextualFromEmail } from '@/lib/email';
import type { ApiResponse, WebinarRegistration } from '@/types';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

/**
 * POST /data/app/webinars/[webinarId]/register
 * Registers user for a free webinar
 * For paid webinars, use the payment flow instead
 */
export async function POST(
  request: Request,
  context: RouteParams
): Promise<NextResponse<ApiResponse<WebinarRegistration>>> {
  const { webinarId } = await context.params;
  console.log('[DBG][register] POST request to register for webinar:', webinarId);

  try {
    const session = await getSession();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.cognitoSub;

    // Get webinar to check if it's free
    const webinar = await webinarRepository.getWebinarByIdOnly(webinarId);
    if (!webinar) {
      return NextResponse.json({ success: false, error: 'Webinar not found' }, { status: 404 });
    }

    // Only allow direct registration for free webinars
    if (webinar.price > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'This webinar requires payment. Please use the payment flow.',
        },
        { status: 400 }
      );
    }

    const userEmail = session.user.email || '';
    const userName = session.user.name || 'Yoga Enthusiast';

    // Register user
    const result = await registerUserForWebinar(
      webinar.expertId,
      userId,
      webinarId,
      userName,
      userEmail
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Registration failed' },
        { status: 400 }
      );
    }

    // Send registration confirmation email
    try {
      if (userEmail) {
        const referer = request.headers.get('referer');
        const fromEmail = getContextualFromEmail(webinar.expertId, referer);

        await sendWebinarRegistrationEmail({
          to: userEmail,
          from: fromEmail,
          customerName: userName,
          webinarTitle: webinar.title,
          webinarDescription: webinar.description?.slice(0, 200) || '',
          sessions: webinar.sessions.map(s => ({
            title: s.title,
            startTime: s.startTime,
            duration: s.duration,
          })),
          currency: 'Free',
          amount: '0',
          transactionId: result.registration?.id || 'FREE',
        });
        console.log('[DBG][register] Registration email sent to', userEmail);
      }
    } catch (emailError) {
      console.error('[DBG][register] Failed to send registration email:', emailError);
      // Don't fail registration if email fails
    }

    console.log('[DBG][register] User registered successfully');

    return NextResponse.json({
      success: true,
      data: result.registration!,
    });
  } catch (error) {
    console.error('[DBG][register] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      },
      { status: 500 }
    );
  }
}
