/**
 * Expert Webinar Email Route
 * POST /data/app/expert/me/webinars/[webinarId]/email - Send custom email to registrants
 */

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import * as webinarRepository from '@/lib/repositories/webinarRepository';
import * as webinarRegistrationRepository from '@/lib/repositories/webinarRegistrationRepository';
import { getTenantById } from '@/lib/repositories/tenantRepository';
import { sendCustomWebinarEmail } from '@/lib/email';

interface RouteParams {
  params: Promise<{
    webinarId: string;
  }>;
}

interface EmailRequest {
  message: string;
  recipientIds?: string[]; // Optional: specific registration IDs, if empty send to all
}

interface EmailResponse {
  sent: number;
  failed: number;
}

/**
 * POST /data/app/expert/me/webinars/[webinarId]/email
 * Send custom email to webinar registrants
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { webinarId } = await params;
  console.log('[DBG][expert/me/webinars/[id]/email] POST called for:', webinarId);

  try {
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<EmailResponse>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user?.expertProfile) {
      return NextResponse.json<ApiResponse<EmailResponse>>(
        { success: false, error: 'Expert profile not found' },
        { status: 403 }
      );
    }

    const webinar = await webinarRepository.getWebinarById(webinarId);

    if (!webinar) {
      return NextResponse.json<ApiResponse<EmailResponse>>(
        { success: false, error: 'Webinar not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (webinar.expertId !== user.expertProfile) {
      return NextResponse.json<ApiResponse<EmailResponse>>(
        { success: false, error: 'Not authorized to email registrants for this webinar' },
        { status: 403 }
      );
    }

    const body: EmailRequest = await request.json();
    const { message, recipientIds } = body;

    if (!message?.trim()) {
      return NextResponse.json<ApiResponse<EmailResponse>>(
        { success: false, error: 'Message is required' },
        { status: 400 }
      );
    }

    // Generate subject based on first session date
    const firstSession = webinar.sessions[0];
    const sessionDate = firstSession
      ? new Date(firstSession.startTime).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'upcoming';
    const subject = `Update: your upcoming webinar (${sessionDate})`;

    // Get registrations
    let registrations = await webinarRegistrationRepository.getRegistrationsByWebinarId(webinarId);

    // Filter to only active registrations
    registrations = registrations.filter(r => r.status === 'registered' || r.status === 'attended');

    // If specific recipients specified, filter to those
    if (recipientIds && recipientIds.length > 0) {
      registrations = registrations.filter(r => recipientIds.includes(r.id));
    }

    // Filter to registrations with email
    const registrationsWithEmail = registrations.filter(r => r.userEmail);

    if (registrationsWithEmail.length === 0) {
      return NextResponse.json<ApiResponse<EmailResponse>>(
        { success: false, error: 'No registrants with email addresses found' },
        { status: 400 }
      );
    }

    console.log(
      '[DBG][expert/me/webinars/[id]/email] Sending to',
      registrationsWithEmail.length,
      'registrants'
    );

    // Fetch tenant for branding and email config
    const tenant = await getTenantById(user.expertProfile);

    // Determine from email: custom domain email > expertId@myyoga.guru
    // Format: "Expert Name <email@domain.com>"
    let emailAddress: string;
    if (tenant?.emailConfig?.domainEmail && tenant.emailConfig.verifiedAt) {
      emailAddress = tenant.emailConfig.domainEmail;
    } else {
      emailAddress = `${user.expertProfile}@myyoga.guru`;
    }
    const expertName = tenant?.name || user.expertProfile;
    const fromEmail = `${expertName} <${emailAddress}>`;

    console.log('[DBG][expert/me/webinars/[id]/email] From email:', fromEmail);

    // Send emails
    let sent = 0;
    let failed = 0;

    for (const registration of registrationsWithEmail) {
      try {
        await sendCustomWebinarEmail({
          to: registration.userEmail!,
          from: fromEmail,
          subject,
          message: message.trim(),
          recipientName: registration.userName || 'Valued Student',
          webinarTitle: webinar.title,
          webinarId,
          expert: tenant
            ? {
                id: tenant.id,
                name: tenant.name,
                logo: tenant.customLandingPage?.branding?.logo,
                avatar: tenant.avatar,
                primaryColor: tenant.customLandingPage?.theme?.primaryColor,
                palette: tenant.customLandingPage?.theme?.palette,
              }
            : undefined,
        });
        sent++;
      } catch (error) {
        console.error(
          '[DBG][expert/me/webinars/[id]/email] Failed to send to:',
          registration.userEmail,
          error
        );
        failed++;
      }
    }

    console.log('[DBG][expert/me/webinars/[id]/email] Sent:', sent, 'Failed:', failed);

    return NextResponse.json<ApiResponse<EmailResponse>>({
      success: true,
      data: { sent, failed },
      message: `Email sent to ${sent} registrant${sent !== 1 ? 's' : ''}${failed > 0 ? ` (${failed} failed)` : ''}`,
    });
  } catch (error) {
    console.error('[DBG][expert/me/webinars/[id]/email] Error:', error);
    return NextResponse.json<ApiResponse<EmailResponse>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send emails',
      },
      { status: 500 }
    );
  }
}
