/**
 * Recording Presigned URL API
 *
 * GET /data/app/expert/me/recordings/[recordingId]/presigned-url
 * Get a presigned URL for playing a 100ms recording
 */

import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSessionFromCookies, getUserByCognitoSub } from '@/lib/auth';
import { getHmsRecordingPresignedUrl } from '@/lib/100ms-meeting';
import { is100msConfigured } from '@/lib/100ms-auth';

interface PresignedUrlResponse {
  url: string;
  expiresIn: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ recordingId: string }> }
) {
  const { recordingId } = await params;
  console.log('[DBG][recordings/presigned-url] GET called for:', recordingId);

  try {
    // Require authentication
    const session = await getSessionFromCookies();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' } as ApiResponse<PresignedUrlResponse>,
        { status: 401 }
      );
    }

    // Get user from DynamoDB
    const user = await getUserByCognitoSub(session.user.cognitoSub);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } as ApiResponse<PresignedUrlResponse>,
        { status: 404 }
      );
    }

    // Check if user is an expert
    const isExpert = Array.isArray(user.role)
      ? user.role.includes('expert')
      : user.role === 'expert';
    if (!isExpert) {
      return NextResponse.json(
        { success: false, error: 'User is not an expert' } as ApiResponse<PresignedUrlResponse>,
        { status: 403 }
      );
    }

    if (!is100msConfigured()) {
      return NextResponse.json(
        { success: false, error: '100ms not configured' } as ApiResponse<PresignedUrlResponse>,
        { status: 500 }
      );
    }

    // Get presigned URL from 100ms
    const url = await getHmsRecordingPresignedUrl(recordingId);

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Recording not found' } as ApiResponse<PresignedUrlResponse>,
        { status: 404 }
      );
    }

    console.log('[DBG][recordings/presigned-url] Got presigned URL');

    return NextResponse.json({
      success: true,
      data: {
        url,
        expiresIn: 3600, // 100ms presigned URLs typically expire in 1 hour
      },
    } as ApiResponse<PresignedUrlResponse>);
  } catch (error) {
    console.error('[DBG][recordings/presigned-url] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get presigned URL',
      } as ApiResponse<PresignedUrlResponse>,
      { status: 500 }
    );
  }
}
