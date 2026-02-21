/**
 * POST /api/data/app/tenant/landing-page/upload
 * Upload an image to S3 for landing page use (authenticated)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { nanoid } from "nanoid";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-2",
});
const AUDIO_BUCKET = process.env.S3_AUDIO_BUCKET || "cally-audio-files";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
];

function getExtension(contentType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  return map[contentType] || "jpg";
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication (mobile Bearer token or web session)
    const mobileAuth = await getMobileAuthResult(request);
    let cognitoSub: string | undefined;
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (mobileAuth.tokenExpired) {
      return NextResponse.json(
        { success: false, error: "Token expired" },
        { status: 401 },
      );
    } else {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }
    if (!cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }
    console.log(
      "[DBG][landing-page-upload] Upload request from user:",
      cognitoSub,
    );

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid file type: ${file.type}. Allowed: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum: 5MB`,
        },
        { status: 400 },
      );
    }

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to S3
    const ext = getExtension(file.type);
    const key = `landing-pages/${tenant.id}/${Date.now()}_${nanoid()}.${ext}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: AUDIO_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    const url = `https://${AUDIO_BUCKET}.s3.${process.env.AWS_REGION || "ap-southeast-2"}.amazonaws.com/${key}`;

    console.log(
      "[DBG][landing-page-upload] Uploaded image for tenant:",
      tenant.id,
      "url:",
      url,
    );

    return NextResponse.json({
      success: true,
      data: { url },
    });
  } catch (error) {
    console.error("[DBG][landing-page-upload] Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: `Upload failed: ${errorMessage}` },
      { status: 500 },
    );
  }
}
