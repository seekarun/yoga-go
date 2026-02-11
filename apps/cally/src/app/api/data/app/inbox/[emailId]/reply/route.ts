/**
 * /api/data/app/inbox/[emailId]/reply
 * POST - Send a reply to an email
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { auth } from "@/auth";
import { getTenantByUserId } from "@/lib/repositories/tenantRepository";
import {
  findEmailById,
  createEmail,
  updateEmailThreadId,
} from "@/lib/repositories/emailRepository";
import { sendReplyEmail } from "@/lib/email/replyEmail";
import { getFromEmail } from "@/lib/email/bookingNotification";
import type { EmailAttachmentInput } from "@core/lib";
import type { EmailAttachment } from "@/types";

// S3 client for fetching uploaded reply attachments
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
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    const cognitoSub = session.user.cognitoSub;
    const { emailId } = await params;

    console.log("[DBG][inbox/reply] POST called for email:", emailId);

    // Get tenant for this user
    const tenant = await getTenantByUserId(cognitoSub);
    if (!tenant) {
      return NextResponse.json(
        { success: false, error: "Tenant not found" },
        { status: 404 },
      );
    }

    // Get original email to reply to
    const originalEmail = await findEmailById(emailId, tenant.id);
    if (!originalEmail) {
      return NextResponse.json(
        { success: false, error: "Email not found" },
        { status: 404 },
      );
    }

    // Parse request body
    const reqBody: ReplyRequestBody = await request.json();

    if (!reqBody.text || reqBody.text.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Reply text is required" },
        { status: 400 },
      );
    }

    // Build reply subject
    const replySubject = originalEmail.subject.startsWith("Re: ")
      ? originalEmail.subject
      : `Re: ${originalEmail.subject}`;

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

    // Send the reply email
    console.log(
      "[DBG][inbox/reply] Sending reply to:",
      originalEmail.from.email,
    );

    const messageId = await sendReplyEmail({
      tenant,
      to: originalEmail.from.email,
      subject: replySubject,
      text: reqBody.text,
      html: reqBody.html,
      attachments: attachmentInputs.length > 0 ? attachmentInputs : undefined,
    });

    console.log("[DBG][inbox/reply] Reply sent, messageId:", messageId);

    // Store the outgoing email in the inbox
    const now = new Date().toISOString();
    const newEmailId = `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Determine threadId - use original's threadId, or original's id if no thread exists yet
    const threadId = originalEmail.threadId || originalEmail.id;

    // If original email didn't have a threadId, update it to start the thread
    if (!originalEmail.threadId) {
      console.log("[DBG][inbox/reply] Starting new thread with id:", threadId);
      await updateEmailThreadId(originalEmail.id, tenant.id, threadId);
    }

    // Get the from email for the stored record
    const fromEmail = getFromEmail(tenant);
    // Extract just the email address from "Name <email>" format
    const fromEmailAddress = fromEmail.match(/<(.+)>/)?.[1] || fromEmail;

    const outgoingEmail = await createEmail({
      id: newEmailId,
      expertId: tenant.id,
      messageId,
      threadId,
      inReplyTo: originalEmail.messageId,
      from: {
        email: fromEmailAddress,
        name: tenant.emailDisplayName || tenant.name,
      },
      to: [originalEmail.from],
      subject: replySubject,
      bodyText: reqBody.text,
      bodyHtml: reqBody.html,
      attachments: attachmentMeta,
      receivedAt: now,
      isOutgoing: true,
      status: "sent",
    });

    console.log("[DBG][inbox/reply] Outgoing email stored:", newEmailId);

    return NextResponse.json({
      success: true,
      data: outgoingEmail,
      message: "Reply sent successfully",
    });
  } catch (error) {
    console.error("[DBG][inbox/reply] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to send reply" },
      { status: 500 },
    );
  }
}
