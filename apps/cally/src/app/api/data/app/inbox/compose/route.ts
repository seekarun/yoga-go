/**
 * POST /api/data/app/inbox/compose
 * Send a new email (compose)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import {
  getTenantByUserId,
  type CallyTenant,
} from "@/lib/repositories/tenantRepository";
import { createEmail } from "@/lib/repositories/emailRepository";
import { deleteDraft } from "@/lib/repositories/draftRepository";
import { sendOutgoingEmail } from "@/lib/email/replyEmail";
import { getFromEmail } from "@/lib/email/bookingNotification";
import type { EmailAttachmentInput } from "@core/lib";
import type {
  EmailAddress,
  EmailAttachment,
  EmailSignatureConfig,
} from "@/types";

const s3Client = new S3Client({ region: "us-west-2" });
const EMAIL_BUCKET =
  process.env.EMAIL_BUCKET || "yoga-go-incoming-emails-710735877057";

interface AttachmentMeta {
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  attachmentId: string;
}

interface ComposeRequestBody {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  text: string;
  html?: string;
  attachments?: AttachmentMeta[];
  draftId?: string;
}

function getSignatureConfig(
  tenant: CallyTenant,
): EmailSignatureConfig | undefined {
  // emailSignatureConfig is stored on tenant object

  const sig = (tenant as unknown as Record<string, unknown>)
    .emailSignatureConfig as EmailSignatureConfig;
  if (sig?.enabled) return sig;
  return undefined;
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

    const body: ComposeRequestBody = await request.json();

    if (!body.to || body.to.length === 0) {
      return NextResponse.json(
        { success: false, error: "At least one recipient is required" },
        { status: 400 },
      );
    }

    if (!body.subject && !body.text) {
      return NextResponse.json(
        { success: false, error: "Subject or body text is required" },
        { status: 400 },
      );
    }

    console.log(
      "[DBG][compose] Composing email for tenant:",
      tenant.id,
      "to:",
      body.to.map((t) => t.email).join(", "),
    );

    // Fetch attachment files from S3 if present
    const attachmentInputs: EmailAttachmentInput[] = [];
    const attachmentMeta: EmailAttachment[] = [];

    if (body.attachments && body.attachments.length > 0) {
      for (const att of body.attachments) {
        const command = new GetObjectCommand({
          Bucket: EMAIL_BUCKET,
          Key: att.s3Key,
        });
        const s3Response = await s3Client.send(command);
        const bodyBytes = await s3Response.Body?.transformToByteArray();

        if (!bodyBytes) {
          console.error(
            "[DBG][compose] Failed to fetch attachment:",
            att.s3Key,
          );
          continue;
        }

        attachmentInputs.push({
          filename: att.filename,
          content: Buffer.from(bodyBytes),
          contentType: att.contentType,
        });

        attachmentMeta.push({
          id: att.attachmentId,
          filename: att.filename,
          mimeType: att.contentType,
          size: att.size,
          s3Key: att.s3Key,
        });
      }
    }

    // Get signature config
    const signature = getSignatureConfig(tenant);

    // Send the email
    const toEmails = body.to.map((a) => a.email);
    const ccEmails = body.cc?.map((a) => a.email);
    const bccEmails = body.bcc?.map((a) => a.email);

    const messageId = await sendOutgoingEmail({
      tenant,
      to: toEmails,
      cc: ccEmails,
      bcc: bccEmails,
      subject: body.subject || "(no subject)",
      text: body.text || "",
      html: body.html,
      attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined,
      signature,
    });

    // Store outgoing email in inbox
    const now = new Date().toISOString();
    const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    const from = getFromEmail(tenant);
    const fromEmailAddress = from.match(/<(.+)>/)?.[1] || from;

    const outgoingEmail = await createEmail({
      id: newEmailId,
      expertId: tenant.id,
      messageId,
      from: {
        email: fromEmailAddress,
        name: tenant.emailDisplayName || tenant.name,
      },
      to: body.to,
      cc: body.cc,
      bcc: body.bcc,
      subject: body.subject || "(no subject)",
      bodyText: body.text || "",
      bodyHtml: body.html,
      attachments: attachmentMeta,
      receivedAt: now,
      isOutgoing: true,
      status: "sent",
    });

    // Delete draft if this was sent from a draft
    if (body.draftId) {
      await deleteDraft(tenant.id, body.draftId);
      console.log("[DBG][compose] Deleted draft after send:", body.draftId);
    }

    console.log("[DBG][compose] Email sent successfully:", newEmailId);

    return NextResponse.json({
      success: true,
      data: outgoingEmail,
      message: "Email sent successfully",
    });
  } catch (error) {
    console.error("[DBG][compose] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send email" },
      { status: 500 },
    );
  }
}
