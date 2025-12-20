/**
 * Expert Inbox Reply API
 * POST /data/app/expert/me/inbox/[emailId]/reply - Send reply to an email
 */

import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getUserByCognitoSub } from '@/lib/repositories/userRepository';
import { findEmailById, createEmail } from '@/lib/repositories/emailRepository';
import { sendReplyEmail } from '@/lib/email';
import type { ApiResponse, Email } from '@/types';

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
    console.log('[DBG][inbox/reply] POST called for email:', emailId);

    // Get session from cookies
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 401,
      });
    }

    // Get user from database
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';

    if (!isExpert || !user.expertProfile) {
      return NextResponse.json(
        { success: false, error: 'Expert profile not found' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Get original email to reply to
    const originalEmail = await findEmailById(emailId, user.expertProfile);

    if (!originalEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    if (originalEmail.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 403,
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

    // Send the reply email
    console.log('[DBG][inbox/reply] Sending reply to:', originalEmail.from.email);

    const messageId = await sendReplyEmail({
      expertId: user.expertProfile,
      to: originalEmail.from.email,
      subject: replySubject,
      text: body.text,
      html: body.html,
      inReplyTo: originalEmail.messageId,
      attachmentLinks: body.attachmentLinks,
    });

    console.log('[DBG][inbox/reply] Reply sent, messageId:', messageId);

    // Store the outgoing email in the inbox
    const now = new Date().toISOString();
    const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const outgoingEmail = await createEmail({
      id: newEmailId,
      expertId: user.expertProfile,
      messageId: messageId,
      threadId: originalEmail.threadId,
      inReplyTo: originalEmail.messageId,
      from: {
        email: `${user.expertProfile}@myyoga.guru`, // Will be replaced with actual from
      },
      to: [originalEmail.from],
      subject: replySubject,
      bodyText: body.text,
      bodyHtml: body.html,
      attachments: [], // Attachment links are in the body, not stored separately
      receivedAt: now,
      isOutgoing: true,
      status: 'sent',
    });

    console.log('[DBG][inbox/reply] Outgoing email stored:', newEmailId);

    return NextResponse.json({
      success: true,
      data: outgoingEmail,
      message: 'Reply sent successfully',
    } as ApiResponse<Email>);
  } catch (error) {
    console.error('[DBG][inbox/reply] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send reply' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
