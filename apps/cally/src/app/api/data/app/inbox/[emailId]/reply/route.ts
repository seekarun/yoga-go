/**
 * /api/data/app/inbox/[emailId]/reply
 * POST - Send a reply, reply-all, or forward
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { getMobileAuthResult } from "@/lib/mobile-auth";
import {
  getTenantByUserId,
  type CallyTenant,
} from "@/lib/repositories/tenantRepository";
import {
  findEmailById,
  createEmail,
  updateEmailThreadId,
} from "@/lib/repositories/emailRepository";
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

interface RouteParams {
  params: Promise<{
    emailId: string;
  }>;
}

interface ReplyAttachmentMeta {
  filename: string;
  contentType: string;
  size: number;
  s3Key: string;
  attachmentId: string;
}

interface ReplyRequestBody {
  text?: string;
  html?: string;
  attachments?: ReplyAttachmentMeta[];
  mode?: "reply" | "reply-all" | "forward";
  to?: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
}

function getSignatureConfig(
  tenant: CallyTenant,
): EmailSignatureConfig | undefined {
  const sig = (tenant as unknown as Record<string, unknown>)
    .emailSignatureConfig as EmailSignatureConfig;
  if (sig?.enabled) return sig;
  return undefined;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Try mobile auth (Bearer token) first, then fall back to cookie auth
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
    const { emailId } = await params;

    console.log("[DBG][inbox/reply] POST called for email:", emailId);

    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    const originalEmail = await findEmailById(emailId, tenant.id);
    if (!originalEmail) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 },
      );
    }

    const reqBody: ReplyRequestBody = await request.json();
    const mode = reqBody.mode || "reply";

    // Forward requires body text or explicit recipients
    if (mode === "forward" && (!reqBody.to || reqBody.to.length === 0)) {
      return NextResponse.json(
        { success: false, error: "Forward requires at least one recipient" },
        { status: 400 },
      );
    }

    if (mode !== "forward" && (!reqBody.text || reqBody.text.trim() === "")) {
      return NextResponse.json(
        { success: false, error: "Reply text is required" },
        { status: 400 },
      );
    }

    // Determine recipients based on mode
    const fromEmail = getFromEmail(tenant);
    const fromEmailAddress = fromEmail.match(/<(.+)>/)?.[1] || fromEmail;
    let toAddresses: EmailAddress[];
    let ccAddresses: EmailAddress[] | undefined;
    let bccAddresses: EmailAddress[] | undefined;
    let subject: string;

    switch (mode) {
      case "reply-all": {
        // Reply to sender
        toAddresses = reqBody.to || [originalEmail.from];
        // CC: original to + cc, minus self
        const allOriginalRecipients = [
          ...(originalEmail.to || []),
          ...(originalEmail.cc || []),
        ].filter(
          (addr) => addr.email.toLowerCase() !== fromEmailAddress.toLowerCase(),
        );
        ccAddresses =
          reqBody.cc ||
          (allOriginalRecipients.length > 0
            ? allOriginalRecipients
            : undefined);
        bccAddresses = reqBody.bcc;
        subject = originalEmail.subject.startsWith("Re: ")
          ? originalEmail.subject
          : `Re: ${originalEmail.subject}`;
        break;
      }
      case "forward": {
        toAddresses = reqBody.to!;
        ccAddresses = reqBody.cc;
        bccAddresses = reqBody.bcc;
        subject = originalEmail.subject.startsWith("Fwd: ")
          ? originalEmail.subject
          : `Fwd: ${originalEmail.subject}`;
        break;
      }
      default: {
        // Simple reply
        toAddresses = reqBody.to || [originalEmail.from];
        ccAddresses = reqBody.cc;
        bccAddresses = reqBody.bcc;
        subject = originalEmail.subject.startsWith("Re: ")
          ? originalEmail.subject
          : `Re: ${originalEmail.subject}`;
        break;
      }
    }

    // Fetch attachment files from S3 if present
    const attachmentInputs: EmailAttachmentInput[] = [];
    const attachmentMeta: EmailAttachment[] = [];

    if (reqBody.attachments && reqBody.attachments.length > 0) {
      console.log(
        "[DBG][inbox/reply] Fetching",
        reqBody.attachments.length,
        "attachments from S3",
      );

      for (const att of reqBody.attachments) {
        const command = new GetObjectCommand({
          Bucket: EMAIL_BUCKET,
          Key: att.s3Key,
        });
        const s3Response = await s3Client.send(command);
        const bodyBytes = await s3Response.Body?.transformToByteArray();

        if (!bodyBytes) {
          console.error(
            "[DBG][inbox/reply] Failed to fetch attachment:",
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

    // For forward, also include original attachments
    if (mode === "forward" && originalEmail.attachments.length > 0) {
      for (const att of originalEmail.attachments) {
        // Skip if already in user-provided attachments
        if (attachmentMeta.some((a) => a.id === att.id)) continue;

        const command = new GetObjectCommand({
          Bucket: EMAIL_BUCKET,
          Key: att.s3Key,
        });
        try {
          const s3Response = await s3Client.send(command);
          const bodyBytes = await s3Response.Body?.transformToByteArray();
          if (bodyBytes) {
            attachmentInputs.push({
              filename: att.filename,
              content: Buffer.from(bodyBytes),
              contentType: att.mimeType,
            });
            attachmentMeta.push(att);
          }
        } catch (err) {
          console.error(
            "[DBG][inbox/reply] Failed to fetch original attachment:",
            att.s3Key,
            err,
          );
        }
      }
    }

    // Build body text for forward (include original message)
    let bodyText = reqBody.text || "";
    let bodyHtml = reqBody.html;

    if (mode === "forward") {
      const fwdHeader = `\n\n---------- Forwarded message ----------\nFrom: ${originalEmail.from.name || ""} <${originalEmail.from.email}>\nDate: ${originalEmail.receivedAt}\nSubject: ${originalEmail.subject}\nTo: ${originalEmail.to.map((t) => t.email).join(", ")}\n\n`;
      bodyText = bodyText + fwdHeader + originalEmail.bodyText;

      const fwdHeaderHtml = `<br><br><div style="border-left:2px solid #ccc;padding-left:12px;margin-left:4px;color:#555"><p style="margin:0"><b>---------- Forwarded message ----------</b><br>From: ${originalEmail.from.name || ""} &lt;${originalEmail.from.email}&gt;<br>Date: ${originalEmail.receivedAt}<br>Subject: ${originalEmail.subject}<br>To: ${originalEmail.to.map((t) => t.email).join(", ")}</p><br>${originalEmail.bodyHtml || originalEmail.bodyText.replace(/\n/g, "<br>")}</div>`;
      bodyHtml = (bodyHtml || bodyText.replace(/\n/g, "<br>")) + fwdHeaderHtml;
    }

    // Get signature config
    const signature = getSignatureConfig(tenant);

    // Send the email
    console.log(
      "[DBG][inbox/reply] Sending",
      mode,
      "to:",
      toAddresses.map((a) => a.email).join(", "),
    );

    const messageId = await sendOutgoingEmail({
      tenant,
      to: toAddresses.map((a) => a.email),
      cc: ccAddresses?.map((a) => a.email),
      bcc: bccAddresses?.map((a) => a.email),
      subject,
      text: bodyText,
      html: bodyHtml,
      attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined,
      signature,
      inReplyTo: mode !== "forward" ? originalEmail.messageId : undefined,
      references: mode !== "forward" ? [originalEmail.messageId] : undefined,
    });

    console.log("[DBG][inbox/reply] Sent, messageId:", messageId);

    // Store the outgoing email
    const now = new Date().toISOString();
    const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Thread handling (replies keep thread, forward starts fresh)
    let threadId: string | undefined;
    if (mode !== "forward") {
      threadId = originalEmail.threadId || originalEmail.id;
      if (!originalEmail.threadId) {
        console.log(
          "[DBG][inbox/reply] Starting new thread with id:",
          threadId,
        );
        await updateEmailThreadId(originalEmail.id, tenant.id, threadId);
      }
    }

    const outgoingEmail = await createEmail({
      id: newEmailId,
      expertId: tenant.id,
      messageId,
      threadId,
      inReplyTo: mode !== "forward" ? originalEmail.messageId : undefined,
      from: {
        email: fromEmailAddress,
        name: tenant.emailDisplayName || tenant.name,
      },
      to: toAddresses,
      cc: ccAddresses,
      bcc: bccAddresses,
      subject,
      bodyText,
      bodyHtml,
      attachments: attachmentMeta,
      receivedAt: now,
      isOutgoing: true,
      status: "sent",
    });

    console.log("[DBG][inbox/reply] Outgoing email stored:", newEmailId);

    return NextResponse.json({
      success: true,
      data: outgoingEmail,
      message: `${mode === "forward" ? "Forward" : "Reply"} sent successfully`,
    });
  } catch (error) {
    console.error("[DBG][inbox/reply] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reply" },
      { status: 500 },
    );
  }
}
