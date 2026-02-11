/**
 * Reply Email Function (for Inbox feature)
 * Sends a reply via SES using the tenant's configured email or fallback.
 * Uses sendRawEmail when attachments are present, sendEmail otherwise.
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import type { EmailAttachmentInput } from "@core/lib";
import { emailClient } from "./index";
import { getFromEmail } from "./bookingNotification";

export interface ReplyEmailOptions {
  tenant: CallyTenant;
  to: string;
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachmentInput[];
}

/**
 * Send a reply email from a tenant
 * Uses the tenant's verified domain email if available, else platform fallback.
 * When attachments are present, uses sendRawEmail to build MIME message.
 *
 * @returns SES message ID
 */
export async function sendReplyEmail(
  options: ReplyEmailOptions,
): Promise<string> {
  const { tenant, to, subject, text, html, attachments } = options;

  console.log(`[DBG][replyEmail] Sending reply for tenant: ${tenant.id}`);
  console.log(`[DBG][replyEmail] To: ${to}, Subject: ${subject}`);
  console.log(`[DBG][replyEmail] Attachments: ${attachments?.length || 0}`);

  const from = getFromEmail(tenant);
  const htmlBody = html || text.replace(/\n/g, "<br>");

  const emailOptions = {
    to,
    from,
    subject,
    text,
    html: htmlBody,
    replyTo: [from],
    tags: [
      { Name: "EmailType", Value: "inbox-reply" },
      { Name: "TenantId", Value: tenant.id },
    ],
  };

  // Use sendRawEmail when there are attachments, sendEmail otherwise
  const messageId =
    attachments && attachments.length > 0
      ? await emailClient.sendRawEmail({ ...emailOptions, attachments })
      : await emailClient.sendEmail(emailOptions);

  console.log(
    `[DBG][replyEmail] Reply sent successfully. MessageId: ${messageId}`,
  );

  return messageId || "";
}
