import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import * as surveyResponseRepository from '@/lib/repositories/surveyResponseRepository';
import type { ApiResponse } from '@/types';
import { sendBulkEmail } from '@/lib/email';

interface RouteParams {
  params: Promise<{
    expertId: string;
  }>;
}

interface EmailRequest {
  responseIds: string[];
  subject: string;
  message: string;
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<ApiResponse<unknown>>> {
  try {
    console.log('[DBG][survey-email-api] Sending emails to selected users');

    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      console.log('[DBG][survey-email-api] Unauthorized access attempt');
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const { expertId } = await params;
    const body: EmailRequest = await request.json();
    const { responseIds, subject, message } = body;

    // Validate input
    if (!responseIds || responseIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No recipients selected',
        },
        { status: 400 }
      );
    }

    if (!subject || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Subject and message are required',
        },
        { status: 400 }
      );
    }

    // Fetch the responses to get email addresses
    // We need to get responses by expertId and filter by the provided responseIds
    const allResponses = await surveyResponseRepository.getResponsesByExpert(expertId);
    const responses = allResponses.filter(r => responseIds.includes(r.id));

    // Extract email addresses
    const recipients = responses
      .map(r => r.contactInfo?.email)
      .filter((email): email is string => !!email);

    if (recipients.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid email addresses found in selected responses',
        },
        { status: 400 }
      );
    }

    console.log(`[DBG][survey-email-api] Recipients: ${recipients.join(', ')}`);

    // Send emails using AWS SES
    try {
      await sendBulkEmail({
        to: recipients,
        subject,
        text: message,
        html: message.replace(/\n/g, '<br>'),
      });

      console.log('[DBG][survey-email-api] Emails sent successfully');

      return NextResponse.json({
        success: true,
        data: {
          sent: recipients.length,
          recipients,
          message: `Successfully sent ${recipients.length} email(s)`,
        },
      });
    } catch (emailError) {
      console.error('[DBG][survey-email-api] Failed to send emails:', emailError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send emails. Please check email service configuration.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[DBG][survey-email-api] Error sending emails:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
