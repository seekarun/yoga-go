/**
 * Expert Inbox Reply API
 * POST /data/app/expert/me/inbox/[emailId]/reply - Send reply to an email
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { requireExpertAuthDual } from '@/lib/auth';
import {
  findEmailById,
  createEmail,
  updateEmailThreadId,
} from '@/lib/repositories/emailRepository';
import { sendReplyEmail } from '@/lib/email';
import type { ApiResponse, Email } from '@/types';

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

interface ReplyRequestBody {
  subject?: string;
  text?: string;
  body?: string; // Alternative field name for mobile
  html?: string;
  attachmentLinks?: string[];
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    console.log('[DBG][inbox/reply] POST called for email:', emailId);

    // Require expert authentication (supports both cookies and Bearer token)
    const { user, session } = await requireExpertAuthDual(request);
    console.log('[DBG][inbox/reply] Authenticated via', session.authType);

    if (!user.expertProfile) {
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
    const reqBody: ReplyRequestBody = await request.json();

    // Support both 'text' and 'body' field names
    const replyText = reqBody.text || reqBody.body;

    if (!replyText || replyText.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Reply text is required' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Build reply subject
    const replySubject =
      reqBody.subject ||
      (originalEmail.subject.startsWith('Re: ')
        ? originalEmail.subject
        : `Re: ${originalEmail.subject}`);

    // Send the reply email
    console.log('[DBG][inbox/reply] Sending reply to:', originalEmail.from.email);

    const messageId = await sendReplyEmail({
      expertId: user.expertProfile,
      to: originalEmail.from.email,
      subject: replySubject,
      text: replyText,
      html: reqBody.html,
      inReplyTo: originalEmail.messageId,
      attachmentLinks: reqBody.attachmentLinks,
    });

    console.log('[DBG][inbox/reply] Reply sent, messageId:', messageId);

    // Store the outgoing email in the inbox
    const now = new Date().toISOString();
    const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Determine threadId - use original's threadId, or original's id if no thread exists yet
    const threadId = originalEmail.threadId || originalEmail.id;

    // If original email didn't have a threadId, update it to start the thread
    if (!originalEmail.threadId) {
      console.log('[DBG][inbox/reply] Starting new thread with id:', threadId);
      await updateEmailThreadId(originalEmail.id, user.expertProfile, threadId);
    }

    const outgoingEmail = await createEmail({
      id: newEmailId,
      expertId: user.expertProfile,
      messageId: messageId,
      threadId: threadId,
      inReplyTo: originalEmail.messageId,
      from: {
        email: `${user.expertProfile}@myyoga.guru`, // Will be replaced with actual from
      },
      to: [originalEmail.from],
      subject: replySubject,
      bodyText: replyText,
      bodyHtml: reqBody.html,
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
