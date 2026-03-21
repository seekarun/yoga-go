/**
 * GET /api/data/app/inbox/export
 * Export all emails as a ZIP of .eml files
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import JSZip from "jszip";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import { getAllEmailsForExport } from "@/lib/repositories/emailRepository";
import { buildEml } from "@/lib/email/emlBuilder";
import type { AttachmentBuffer } from "@/lib/email/emlBuilder";
import type { Email, EmailAttachment } from "@/types";

const s3Client = new S3Client({ region: "us-west-2" });
const EMAIL_BUCKET =
  process.env.EMAIL_BUCKET || "yoga-go-incoming-emails-710735877057";

const MAX_TOTAL_SIZE = 8 * 1024 * 1024; // 8MB safety limit

/**
 * Fetch a single attachment from S3
 */
const fetchAttachment = async (
  att: EmailAttachment,
): Promise<AttachmentBuffer | null> => {
  try {
    const result = await s3Client.send(
      new GetObjectCommand({
        Bucket: EMAIL_BUCKET,
        Key: att.s3Key,
      }),
    );
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) return null;
    return { attachment: att, buffer: Buffer.from(bytes) };
  } catch (error) {
    console.error(
      "[DBG][inbox-export] Failed to fetch attachment:",
      att.s3Key,
      error,
    );
    return null;
  }
};

/**
 * Fetch attachments for a batch of emails, respecting size limit.
 * Returns a map of emailId → AttachmentBuffer[]
 */
const fetchAllAttachments = async (
  emails: Email[],
): Promise<{
  attachmentMap: Map<string, AttachmentBuffer[]>;
  skipped: boolean;
}> => {
  const attachmentMap = new Map<string, AttachmentBuffer[]>();
  let totalSize = 0;
  let skipped = false;

  for (const email of emails) {
    if (!email.attachments || email.attachments.length === 0) continue;

    // Check if adding these attachments would exceed limit
    const estimatedSize = email.attachments.reduce(
      (sum, att) => sum + att.size,
      0,
    );
    if (totalSize + estimatedSize > MAX_TOTAL_SIZE) {
      skipped = true;
      console.log(
        "[DBG][inbox-export] Skipping attachments for email",
        email.id,
        "- would exceed size limit",
      );
      continue;
    }

    // Fetch in parallel batches of 5
    const buffers: AttachmentBuffer[] = [];
    for (let i = 0; i < email.attachments.length; i += 5) {
      const batch = email.attachments.slice(i, i + 5);
      const results = await Promise.all(batch.map(fetchAttachment));
      for (const result of results) {
        if (result) {
          buffers.push(result);
          totalSize += result.buffer.length;
        }
      }
    }

    if (buffers.length > 0) {
      attachmentMap.set(email.id, buffers);
    }
  }

  return { attachmentMap, skipped };
};

/**
 * Generate a filename for an .eml file
 */
const emlFilename = (email: Email): string => {
  const date = new Date(email.receivedAt);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  const shortId = email.id.substring(0, 8);
  return `${yyyy}-${mm}-${dd}_${hh}${min}${ss}_${shortId}.eml`;
};

export async function GET(request: NextRequest) {
  try {
    // Auth — Bearer token (mobile) or cookie (web)
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

    console.log("[DBG][inbox-export] Export requested by:", cognitoSub);

    // Get tenant
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get all emails
    const emails = await getAllEmailsForExport(tenant.id);
    console.log("[DBG][inbox-export] Found", emails.length, "emails to export");

    if (emails.length === 0) {
      return NextResponse.json(
        { success: false, error: "No emails to export" },
        { status: 404 },
      );
    }

    // Fetch attachments from S3
    const { attachmentMap, skipped } = await fetchAllAttachments(emails);

    // Build ZIP
    const zip = new JSZip();

    for (const email of emails) {
      const buffers = attachmentMap.get(email.id) || [];
      const emlContent = buildEml(email, buffers);
      zip.file(emlFilename(email), emlContent);
    }

    // Add readme if attachments were skipped
    if (skipped) {
      zip.file(
        "_README.txt",
        "Some email attachments were skipped because the total export size would have exceeded the 8MB limit.\n" +
          "The email text and headers are still included. To get the full attachments, view the emails in the app.\n",
      );
    }

    const zipBuffer = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const dateStr = new Date().toISOString().split("T")[0];

    console.log(
      "[DBG][inbox-export] Export complete:",
      emails.length,
      "emails,",
      zipBuffer.length,
      "bytes",
    );

    return new Response(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="emails-export-${dateStr}.zip"`,
        "Content-Length": String(zipBuffer.length),
      },
    });
  } catch (error) {
    console.error("[DBG][inbox-export] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
