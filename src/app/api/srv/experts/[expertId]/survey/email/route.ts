import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import SurveyResponse from '@/models/SurveyResponse';
import type { ApiResponse } from '@/types';

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
): Promise<NextResponse<ApiResponse<any>>> {
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

    // Connect to database
    await connectToDatabase();

    // Fetch the responses to get email addresses
    const responses = await SurveyResponse.find({
      _id: { $in: responseIds },
      expertId,
    }).lean();

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

    // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Resend)
    // For now, we'll just log the email details
    console.log('[DBG][survey-email-api] Email Details:');
    console.log(`  Subject: ${subject}`);
    console.log(`  Message: ${message}`);
    console.log(`  Recipients: ${recipients.length}`);

    // Mock implementation - in production, you would send actual emails here
    // Example with SendGrid:
    // import sgMail from '@sendgrid/mail';
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.sendMultiple({
    //   to: recipients,
    //   from: 'noreply@yoga-go.com',
    //   subject,
    //   text: message,
    //   html: message.replace(/\n/g, '<br>'),
    // });

    return NextResponse.json({
      success: true,
      data: {
        sent: recipients.length,
        recipients,
        message:
          'Email functionality is not yet configured. Please set up an email service (SendGrid, AWS SES, or Resend) to send emails.',
      },
    });
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
