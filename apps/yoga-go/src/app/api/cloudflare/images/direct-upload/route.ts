/**
 * Direct Image Upload to Cloudflare Images
 * POST /api/cloudflare/images/direct-upload
 *
 * Simple upload endpoint that doesn't require tenantId or store in asset repository.
 * Used for user profile pictures and other non-tenant-specific images.
 *
 * Supports dual auth: cookies (web) or Bearer token (mobile)
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getSessionDual } from '@/lib/auth';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_TOKEN;

interface DirectUploadResult {
  id: string;
  url: string;
}

export async function POST(request: NextRequest) {
  console.log('[DBG][cloudflare/images/direct-upload] POST called');

  try {
    // Verify authentication (supports both cookies and Bearer token)
    const session = await getSessionDual(request);
    if (!session?.user?.cognitoSub) {
      return NextResponse.json<ApiResponse<DirectUploadResult>>(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    console.log('[DBG][cloudflare/images/direct-upload] Authenticated via', session.authType);

    if (!CF_ACCOUNT_ID || !CF_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json<ApiResponse<DirectUploadResult>>(
        { success: false, error: 'File is required' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json<ApiResponse<DirectUploadResult>>(
        { success: false, error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json<ApiResponse<DirectUploadResult>>(
        { success: false, error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    console.log('[DBG][cloudflare/images/direct-upload] Uploading file:', file.name);

    // Upload to Cloudflare Images
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const uploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
        },
        body: uploadFormData,
      }
    );

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || !uploadResult.success) {
      console.error('[DBG][cloudflare/images/direct-upload] Upload failed:', uploadResult);
      throw new Error(uploadResult.errors?.[0]?.message || 'Failed to upload image');
    }

    const imageId = uploadResult.result.id;
    const imageUrl = uploadResult.result.variants[0]; // Default variant

    console.log('[DBG][cloudflare/images/direct-upload] Upload successful:', imageId);

    return NextResponse.json<ApiResponse<DirectUploadResult>>({
      success: true,
      data: {
        id: imageId,
        url: imageUrl,
      },
    });
  } catch (error) {
    console.error('[DBG][cloudflare/images/direct-upload] Error:', error);
    return NextResponse.json<ApiResponse<DirectUploadResult>>(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      },
      { status: 500 }
    );
  }
}
