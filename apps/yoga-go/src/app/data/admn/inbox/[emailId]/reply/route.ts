/**
 * Admin Inbox Reply API
 * POST /data/admn/inbox/[emailId]/reply - Send reply to a platform email
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { findEmailById, createEmail } from '@/lib/repositories/emailRepository';
import { sendAdminReplyEmail } from '@/lib/email';
import type { ApiResponse, Email } from '@/types';

const ADMIN_INBOX_ID = 'ADMIN';

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

interface ReplyRequestBody {
  subject?: string;
  text: string;
  html?: string;
  attachmentLinks?: string[];
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    console.log('[DBG][admn/inbox/reply] POST called for email:', emailId);

    // Require admin authentication
    await requireAdminAuth();

    // Get original email to reply to
    const originalEmail = await findEmailById(emailId, ADMIN_INBOX_ID);

    if (!originalEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Parse request body
    const body: ReplyRequestBody = await request.json();

    if (!body.text || body.text.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Reply text is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Build reply subject
    const replySubject =
      body.subject ||
      (originalEmail.subject.startsWith('Re: ')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`);

    // Send the reply email from hi@myyoga.guru
    console.log('[DBG][admn/inbox/reply] Sending reply to:', originalEmail.from.email);

    const messageId = await sendAdminReplyEmail({
      to: originalEmail.from.email,
      subject: replySubject,
      text: body.text,
      html: body.html,
      inReplyTo: originalEmail.messageId,
      attachmentLinks: body.attachmentLinks,
    });

    console.log('[DBG][admn/inbox/reply] Reply sent, messageId:', messageId);

    // Store the outgoing email in the admin inbox
    const now = new Date().toISOString();
    const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const outgoingEmail = await createEmail({
      id: newEmailId,
      expertId: ADMIN_INBOX_ID,
      messageId: messageId,
      threadId: originalEmail.threadId,
      inReplyTo: originalEmail.messageId,
      from: {
        email: 'hi@myyoga.guru',
        name: 'MyYoga.Guru',
      },
      to: [originalEmail.from],
      subject: replySubject,
      bodyText: body.text,
      bodyHtml: body.html,
      attachments: [],
      receivedAt: now,
      isOutgoing: true,
      status: 'sent',
    });

    console.log('[DBG][admn/inbox/reply] Outgoing email stored:', newEmailId);

    return NextResponse.json({
      success: true,
      data: outgoingEmail,
      message: 'Reply sent successfully',
    } as ApiResponse<Email>);
  } catch (error) {
    console.error('[DBG][admn/inbox/reply] Error:', error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to send reply' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
