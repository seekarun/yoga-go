/**
 * Admin Inbox Email Detail API Routes
 * GET /data/admn/inbox/[emailId] - Get single email
 * PATCH /data/admn/inbox/[emailId] - Update read/starred status
 */

import { NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/auth';
import { findEmailById, updateEmailStatus } from '@/lib/repositories/emailRepository';
import type { ApiResponse, Email } from '@/types';

const ADMIN_INBOX_ID = 'ADMIN';

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    console.log('[DBG][admn/inbox/[emailId]] GET called:', emailId);

    // Require admin authentication
    await requireAdminAuth();

    // Get email using ADMIN as expertId
    const email = await findEmailById(emailId, ADMIN_INBOX_ID);

    if (!email) {
      console.log('[DBG][admn/inbox/[emailId]] Email not found:', emailId);
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    console.log('[DBG][admn/inbox/[emailId]] Found email:', emailId);

    return NextResponse.json({
      success: true,
      data: email,
    } as ApiResponse<Email>);
  } catch (error) {
    console.error('[DBG][admn/inbox/[emailId]] Error:', error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to fetch email' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    console.log('[DBG][admn/inbox/[emailId]] PATCH called:', emailId);

    // Require admin authentication
    await requireAdminAuth();

    // Get existing email to get receivedAt
    const existingEmail = await findEmailById(emailId, ADMIN_INBOX_ID);

    if (!existingEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Parse update body
    const body = await request.json();
    const updates: { isRead?: boolean; isStarred?: boolean } = {};

    if (typeof body.isRead === 'boolean') {
      updates.isRead = body.isRead;
    }
    if (typeof body.isStarred === 'boolean') {
      updates.isStarred = body.isStarred;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid updates provided' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    console.log('[DBG][admn/inbox/[emailId]] Updating email:', emailId, updates);

    // Update email status
    const updatedEmail = await updateEmailStatus(
      emailId,
      ADMIN_INBOX_ID,
      existingEmail.receivedAt,
      updates
    );

    if (!updatedEmail) {
      return NextResponse.json(
        { success: false, error: 'Failed to update email' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    console.log('[DBG][admn/inbox/[emailId]] Updated email:', emailId);

    return NextResponse.json({
      success: true,
      data: updatedEmail,
    } as ApiResponse<Email>);
  } catch (error) {
    console.error('[DBG][admn/inbox/[emailId]] Error:', error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to update email' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
