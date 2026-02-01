/**
 * Admin Inbox Attachment Download API
 * GET /data/admn/inbox/[emailId]/attachments/[attachmentId] - Get presigned download URL
 */

import { NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { requireAdminAuth } from '@/lib/auth';
import { findEmailById } from '@/lib/repositories/emailRepository';
import type { ApiResponse } from '@/types';

// S3 client for email attachments (us-west-2 region where SES stores emails)
const s3Client = new S3Client({ region: 'us-west-2' });
const EMAIL_BUCKET = process.env.EMAIL_BUCKET || 'yoga-go-incoming-emails-710735877057';

const ADMIN_INBOX_ID = 'ADMIN';

interface RouteParams {
  params: Promise<{ emailId: string; attachmentId: string }>;
}

interface AttachmentDownloadResponse {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  expiresIn: number;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { emailId, attachmentId } = await params;
    console.log('[DBG][admn/inbox/attachments] GET called:', emailId, attachmentId);

    // Require admin authentication
    await requireAdminAuth();

    // Get email using ADMIN as expertId
    const email = await findEmailById(emailId, ADMIN_INBOX_ID);

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email not found' } as ApiResponse<null>, {
        status: 404,
      });
    }

    // Find attachment in email
    const attachment = email.attachments.find(a => a.id === attachmentId);

    if (!attachment) {
      console.log('[DBG][admn/inbox/attachments] Attachment not found:', attachmentId);
      return NextResponse.json(
        { success: false, error: 'Attachment not found' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Generate presigned URL for download (5 minute expiry)
    const expiresIn = 300; // 5 minutes
    const command = new GetObjectCommand({
      Bucket: EMAIL_BUCKET,
      Key: attachment.s3Key,
      ResponseContentDisposition: `attachment; filename="${attachment.filename}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    console.log('[DBG][admn/inbox/attachments] Generated presigned URL for:', attachment.filename);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        filename: attachment.filename,
        mimeType: attachment.mimeType,
        expiresIn,
      },
    } as ApiResponse<AttachmentDownloadResponse>);
  } catch (error) {
    console.error('[DBG][admn/inbox/attachments] Error:', error);

    // Check if it's an auth error
    if (error instanceof Error && error.message.includes('Forbidden')) {
      return NextResponse.json(
        { success: false, error: 'Admin access required' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Failed to get attachment' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
