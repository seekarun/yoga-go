/**
 * POST /api/data/app/inbox/import
 * Import emails from .eml or .mbox files
 *
 * Accepts multipart/form-data with one or more files.
 * Supported formats: .eml (individual emails), .mbox (archive of multiple emails)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { createEmail } from "@/lib/repositories/emailRepository";
import { parseEml, parseMbox } from "@/lib/email/emlParser";
import type { ParsedEmailResult } from "@/lib/email/emlParser";

const s3Client = new S3Client({ region: "us-west-2" });
const EMAIL_BUCKET =
  process.env.EMAIL_BUCKET || "yoga-go-incoming-emails-710735877057";

const MAX_UPLOAD_SIZE = 25 * 1024 * 1024; // 25MB total upload limit
const MAX_EMAILS = 500; // Safety cap on number of emails per import

/**
 * Upload a single attachment buffer to S3
 */
const uploadAttachmentToS3 = async (
  tenantId: string,
  emailId: string,
  attId: string,
  filename: string,
  contentType: string,
  buffer: Buffer,
): Promise<string> => {
  const s3Key = `imported-attachments/${tenantId}/${emailId}/${attId}/${filename}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: EMAIL_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: contentType,
    }),
  );

  return s3Key;
};

/**
 * Process a single parsed email: upload attachments to S3, create DB record
 */
const processEmail = async (
  tenantId: string,
  parsed: ParsedEmailResult,
): Promise<{ id: string; subject: string }> => {
  // Upload attachments to S3 and fill in s3Keys
  for (const { meta, buffer } of parsed.attachmentBuffers) {
    const s3Key = await uploadAttachmentToS3(
      tenantId,
      parsed.email.id,
      meta.id,
      meta.filename,
      meta.mimeType,
      buffer,
    );
    meta.s3Key = s3Key;
  }

  // Create the email record in DynamoDB
  const email = await createEmail({
    ...parsed.email,
    expertId: tenantId,
  });

  return { id: email.id, subject: email.subject };
};

export async function POST(request: NextRequest) {
  try {
    // Auth
    let cognitoSub: string | undefined;

    const mobileAuth = await getMobileAuthResult(request);
    if (mobileAuth.session) {
      cognitoSub = mobileAuth.session.cognitoSub;
    } else if (!mobileAuth.tokenExpired) {
      const session = await auth();
      cognitoSub = session?.user?.cognitoSub;
    }

    if (!cognitoSub) {
      return NextResponse.json(
        {
          success: false,
          error: mobileAuth.tokenExpired
            ? "Token expired"
            : "Not authenticated",
        },
        { status: 401 },
      );
    }

    console.log("[DBG][inbox-import] Import requested by:", cognitoSub);

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: "No files provided" },
        { status: 400 },
      );
    }

    // Validate total size
    let totalSize = 0;
    for (const file of files) {
      if (!(file instanceof File)) continue;
      totalSize += file.size;
    }

    if (totalSize > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: `Total upload size (${Math.round(totalSize / 1024 / 1024)}MB) exceeds limit of ${MAX_UPLOAD_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Parse all files into email results
    const allParsed: ParsedEmailResult[] = [];
    const errors: string[] = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      const filename = file.name.toLowerCase();
      const content = await file.text();

      try {
        if (filename.endsWith(".mbox")) {
          const mboxResults = await parseMbox(content);
          console.log(
            "[DBG][inbox-import] Parsed",
            mboxResults.length,
            "emails from mbox:",
            file.name,
          );
          allParsed.push(...mboxResults);
        } else if (filename.endsWith(".eml")) {
          const emlResult = await parseEml(content);
          allParsed.push(emlResult);
        } else {
          errors.push(
            `Unsupported file format: ${file.name} (use .eml or .mbox)`,
          );
        }
      } catch (err) {
        console.error(
          "[DBG][inbox-import] Failed to parse file:",
          file.name,
          err,
        );
        errors.push(
          `Failed to parse ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    if (allParsed.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid emails found in uploaded files",
          details: errors.length > 0 ? errors : undefined,
        },
        { status: 400 },
      );
    }

    // Cap at MAX_EMAILS
    const toImport = allParsed.slice(0, MAX_EMAILS);
    const capped = allParsed.length > MAX_EMAILS;

    console.log(
      "[DBG][inbox-import] Importing",
      toImport.length,
      "emails for tenant:",
      tenant.id,
    );

    // Process emails — sequential to avoid overwhelming DynamoDB/S3
    const imported: { id: string; subject: string }[] = [];
    const importErrors: string[] = [];

    for (const parsed of toImport) {
      try {
        const result = await processEmail(tenant.id, parsed);
        imported.push(result);
      } catch (err) {
        console.error(
          "[DBG][inbox-import] Failed to import email:",
          parsed.email.subject,
          err,
        );
        importErrors.push(
          `Failed to import "${parsed.email.subject}": ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      }
    }

    console.log(
      "[DBG][inbox-import] Import complete:",
      imported.length,
      "imported,",
      importErrors.length,
      "errors",
    );

    return NextResponse.json({
      success: true,
      data: {
        imported: imported.length,
        failed: importErrors.length,
        total: allParsed.length,
        capped,
        errors:
          [...errors, ...importErrors].length > 0
            ? [...errors, ...importErrors]
            : undefined,
      },
    });
  } catch (error) {
    console.error("[DBG][inbox-import] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
