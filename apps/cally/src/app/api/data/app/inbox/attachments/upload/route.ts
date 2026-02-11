/**
 * /api/data/app/inbox/attachments/upload
 * POST - Get presigned PUT URL for uploading a reply attachment to S3
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";

// S3 client (us-west-2 to match email bucket region)
const s3Client = new S3Client({ region: "us-west-2" });
const EMAIL_BUCKET =
  process.env.EMAIL_BUCKET || "yoga-go-incoming-emails-710735877057";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface UploadRequest {
  filename: string;
  contentType: string;
  size: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const body: UploadRequest = await request.json();
    const { filename, contentType, size } = body;

    if (!filename || !contentType || !size) {
      return NextResponse.json(
        {
          success: false,
          error: "filename, contentType, and size are required",
        },
        { status: 400 },
      );
    }

    if (size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    // Generate a unique attachment ID and S3 key
    const attachmentId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const s3Key = `reply-attachments/${tenant.id}/${attachmentId}/${filename}`;

    console.log(
      "[DBG][inbox/attachments/upload] Generating presigned PUT URL:",
      s3Key,
    );

    // Generate presigned PUT URL (10 min expiry)
    const command = new PutObjectCommand({
      Bucket: EMAIL_BUCKET,
      Key: s3Key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 600,
    });

    return NextResponse.json({
      success: true,
      data: {
        uploadUrl,
        attachmentId,
        s3Key,
        filename,
        contentType,
        expiresIn: 600,
      },
    });
  } catch (error) {
    console.error("[DBG][inbox/attachments/upload] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
