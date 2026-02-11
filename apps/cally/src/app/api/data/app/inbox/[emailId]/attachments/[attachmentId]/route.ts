/**
 * /api/data/app/inbox/[emailId]/attachments/[attachmentId]
 * GET - Get presigned download URL for an email attachment
 */
import { NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { findEmailById } from "@/lib/repositories/emailRepository";

// S3 client for email attachments (us-west-2 where SES stores emails)
const s3Client = new S3Client({ region: "us-west-2" });
const EMAIL_BUCKET =
  process.env.EMAIL_BUCKET || "yoga-go-incoming-emails-710735877057";

interface RouteParams {
  params: Promise<{ emailId: string; attachmentId: string }>;
}

interface AttachmentDownloadResponse {
  downloadUrl: string;
  filename: string;
  mimeType: string;
  expiresIn: number;
}

export async function GET(
  _request: Request,
  { params }: RouteParams,
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const { emailId, attachmentId } = await params;
    console.log("[DBG][inbox/attachments] GET called:", emailId, attachmentId);

    const tenant = await getTenantByUserId(session.user.cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get email to verify ownership and find attachment
    const email = await findEmailById(emailId, tenant.id);
    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 },
      );
    }

    if (email.expertId !== tenant.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 },
      );
    }

    // Find attachment in email
    const attachment = email.attachments.find((a) => a.id === attachmentId);
    if (!attachment) {
      console.log(
        "[DBG][inbox/attachments] Attachment not found:",
        attachmentId,
      );
      return NextResponse.json(
        { success: false, error: "Attachment not found" },
        { status: 404 },
      );
    }

    // Generate presigned URL for download (5 minute expiry)
    const expiresIn = 300;
    const command = new GetObjectCommand({
      Bucket: EMAIL_BUCKET,
      Key: attachment.s3Key,
      ResponseContentDisposition: `attachment; filename="${attachment.filename}"`,
    });

    const downloadUrl = await getSignedUrl(s3Client, command, { expiresIn });

    console.log(
      "[DBG][inbox/attachments] Generated presigned URL for:",
      attachment.filename,
    );

    const data: AttachmentDownloadResponse = {
      downloadUrl,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      expiresIn,
    };

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[DBG][inbox/attachments] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to get attachment" },
      { status: 500 },
    );
  }
}
