import { NextResponse } from 'next/server';
import type { ApiResponse, Asset } from '@/types';
import * as assetRepository from '@/lib/repositories/assetRepository';

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_TOKEN;

export async function POST(request: Request) {
  console.log('[DBG][cloudflare/images/upload] POST called');

  try {
    if (!CF_ACCOUNT_ID || !CF_TOKEN) {
      throw new Error('Cloudflare credentials not configured');
    }

    const formData = await request.formData();
    const originalFile = formData.get('original') as File;
    const croppedFile = formData.get('cropped') as File | null;
    const category = formData.get('category') as string;
    const tenantId = formData.get('tenantId') as string; // Required: expert ID
    const relatedToType = formData.get('relatedToType') as string | null;
    const relatedToId = formData.get('relatedToId') as string | null;
    const uploadedBy = formData.get('uploadedBy') as string | null;
    const cropDataStr = formData.get('cropData') as string | null;

    if (!originalFile) {
      return NextResponse.json(
        {
          success: false,
          error: 'Original file is required',
        } as ApiResponse<Asset>,
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        {
          success: false,
          error: 'tenantId is required',
        } as ApiResponse<Asset>,
        { status: 400 }
      );
    }

    console.log('[DBG][cloudflare/images/upload] Uploading original file:', originalFile.name);

    // Upload original image to Cloudflare Images
    const originalFormData = new FormData();
    originalFormData.append('file', originalFile);

    const originalUploadResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
        },
        body: originalFormData,
      }
    );

    const originalUploadResult = await originalUploadResponse.json();

    if (!originalUploadResponse.ok || !originalUploadResult.success) {
      console.error(
        '[DBG][cloudflare/images/upload] Original upload failed:',
        originalUploadResult
      );
      throw new Error(
        originalUploadResult.errors?.[0]?.message || 'Failed to upload original image'
      );
    }

    const originalImageId = originalUploadResult.result.id;
    const originalUrl = originalUploadResult.result.variants[0]; // Default variant

    console.log('[DBG][cloudflare/images/upload] Original uploaded:', originalImageId);

    // Upload cropped image if provided
    let croppedImageId: string | undefined;
    let croppedUrl: string | undefined;

    if (croppedFile) {
      console.log('[DBG][cloudflare/images/upload] Uploading cropped file:', croppedFile.name);

      const croppedFormData = new FormData();
      croppedFormData.append('file', croppedFile);

      const croppedUploadResponse = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${CF_TOKEN}`,
          },
          body: croppedFormData,
        }
      );

      const croppedUploadResult = await croppedUploadResponse.json();

      if (croppedUploadResponse.ok && croppedUploadResult.success) {
        croppedImageId = croppedUploadResult.result.id;
        croppedUrl = croppedUploadResult.result.variants[0];
        console.log('[DBG][cloudflare/images/upload] Cropped uploaded:', croppedImageId);
      } else {
        console.warn('[DBG][cloudflare/images/upload] Cropped upload failed:', croppedUploadResult);
      }
    }

    // Get image dimensions from original file
    const arrayBuffer = await originalFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dimensions = await getImageDimensions(buffer);

    // Save to DynamoDB
    const assetId = `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const cropData = cropDataStr ? JSON.parse(cropDataStr) : undefined;
    const now = new Date().toISOString();

    const assetData: Asset = {
      id: assetId,
      tenantId, // Partition key for tenant isolation
      filename: originalFile.name,
      originalUrl,
      croppedUrl,
      cloudflareImageId: originalImageId,
      croppedCloudflareImageId: croppedImageId,
      type: 'image' as const,
      category: (category || 'other') as Asset['category'],
      dimensions,
      cropData,
      size: originalFile.size,
      mimeType: originalFile.type,
      uploadedBy: uploadedBy || undefined,
      relatedTo:
        relatedToType && relatedToId
          ? {
              type: relatedToType as 'expert' | 'user' | 'course' | 'lesson',
              id: relatedToId,
            }
          : undefined,
      metadata: {
        originalFilename: originalFile.name,
        uploadedAt: now,
      },
      createdAt: now,
      updatedAt: now,
    };

    const asset = await assetRepository.createAsset(assetData);

    console.log('[DBG][cloudflare/images/upload] Asset saved to DB:', assetId);

    const response: ApiResponse<Asset> = {
      success: true,
      data: asset,
      message: 'Image uploaded successfully',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[DBG][cloudflare/images/upload] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to upload image',
      } as ApiResponse<Asset>,
      { status: 500 }
    );
  }
}

// Helper function to get image dimensions
async function getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
  // Simple PNG/JPEG dimension extraction
  // For production, consider using a library like 'image-size'
  try {
    // Check if it's a JPEG
    if (buffer[0] === 0xff && buffer[1] === 0xd8) {
      let offset = 2;
      while (offset < buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1];
        if (marker === 0xc0 || marker === 0xc2) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset += 2 + buffer.readUInt16BE(offset + 2);
      }
    }
    // Check if it's a PNG
    else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      const width = buffer.readUInt32BE(16);
      const height = buffer.readUInt32BE(20);
      return { width, height };
    }
  } catch (error) {
    console.error('[DBG][cloudflare/images/upload] Error getting dimensions:', error);
  }

  // Default dimensions if detection fails
  return { width: 0, height: 0 };
}
