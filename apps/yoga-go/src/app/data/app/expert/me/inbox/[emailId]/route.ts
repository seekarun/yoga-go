/**
 * Expert Inbox Email Detail API Routes
 * GET /data/app/expert/me/inbox/[emailId] - Get single email
 * PATCH /data/app/expert/me/inbox/[emailId] - Update read/starred status
 */

import { NextResponse } from 'next/server';
import { getSessionFromCookies } from '@/lib/auth';
import { getUserByCognitoSub } from '@/lib/repositories/userRepository';
import { findEmailById, updateEmailStatus } from '@/lib/repositories/emailRepository';
import type { ApiResponse, Email } from '@/types';

interface RouteParams {
  params: Promise<{ emailId: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    console.log('[DBG][expert/me/inbox/[emailId]] GET called:', emailId);

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

    // Get email
    const email = await findEmailById(emailId, user.expertProfile);

    if (!email) {
      console.log('[DBG][expert/me/inbox/[emailId]] Email not found:', emailId);
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Verify ownership
    if (email.expertId !== user.expertProfile) {
      console.log('[DBG][expert/me/inbox/[emailId]] Unauthorized access attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 403,
      });
    }

    console.log('[DBG][expert/me/inbox/[emailId]] Found email:', emailId);

    return NextResponse.json({
      success: true,
      data: email,
    } as ApiResponse<Email>);
  } catch (error) {
    console.error('[DBG][expert/me/inbox/[emailId]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch email' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    console.log('[DBG][expert/me/inbox/[emailId]] PATCH called:', emailId);

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

    // Get existing email to verify ownership and get receivedAt
    const existingEmail = await findEmailById(emailId, user.expertProfile);

    if (!existingEmail) {
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    if (existingEmail.expertId !== user.expertProfile) {
      return NextResponse.json({ success: false, error: 'Unauthorized' } as ApiResponse<null>, {
        status: 403,
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

    console.log('[DBG][expert/me/inbox/[emailId]] Updating email:', emailId, updates);

    // Update email status
    const updatedEmail = await updateEmailStatus(
      emailId,
      user.expertProfile,
      existingEmail.receivedAt,
      updates
    );

    if (!updatedEmail) {
      return NextResponse.json(
        { success: false, error: 'Failed to update email' } as ApiResponse<null>,
        { status: 500 }
      );
    }

    console.log('[DBG][expert/me/inbox/[emailId]] Updated email:', emailId);

    return NextResponse.json({
      success: true,
      data: updatedEmail,
    } as ApiResponse<Email>);
  } catch (error) {
    console.error('[DBG][expert/me/inbox/[emailId]] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update email' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
