/**
 * Reply Email Function (for Inbox feature)
 * Sends a reply via SES using the tenant's configured email or fallback.
 * Uses sendRawEmail when attachments are present, sendEmail otherwise.
 */
import type { CallyTenant } from "@/lib/repositories/tenantRepository";
import type { EmailAttachmentInput } from "@core/lib";
import type { EmailSignatureConfig } from "@/types";
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

export interface OutgoingEmailOptions {
  tenant: CallyTenant;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachmentInput[];
  signature?: EmailSignatureConfig;
  inReplyTo?: string;
  references?: string[];
}

/**
 * Send a reply email from a tenant (legacy, kept for backward compatibility)
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

/**
 * Append signature to email body
 */
function appendSignature(
  text: string,
  html: string | undefined,
  signature: EmailSignatureConfig,
): { text: string; html: string } {
  const sigText = `\n\n--\n${signature.text}`;
  const sigHtml = `<br><br><div style="border-top:1px solid #ccc;padding-top:8px;margin-top:16px;color:#666">${signature.html}</div>`;
  return {
    text: text + sigText,
    html: (html || text.replace(/\n/g, "<br>")) + sigHtml,
  };
}

/**
 * Send an outgoing email supporting to/cc/bcc, signature, and threading headers
 * @returns SES message ID
 */
export async function sendOutgoingEmail(
  options: OutgoingEmailOptions,
): Promise<string> {
  const {
    tenant,
    to,
    cc,
    bcc,
    subject,
    text,
    html,
    attachments,
    signature,
    inReplyTo,
    references,
  } = options;

  console.log(
    `[DBG][replyEmail] Sending outgoing email for tenant: ${tenant.id}`,
  );
  console.log(`[DBG][replyEmail] To: ${to.join(", ")}, Subject: ${subject}`);

  const from = getFromEmail(tenant);

  // Apply signature if enabled
  let finalText = text;
  let finalHtml = html || text.replace(/\n/g, "<br>");
  if (signature?.enabled && signature.text) {
    const signed = appendSignature(text, html, signature);
    finalText = signed.text;
    finalHtml = signed.html;
  }

  const hasCcOrBcc = (cc && cc.length > 0) || (bcc && bcc.length > 0);
  const hasAttachments = attachments && attachments.length > 0;
  const hasThreadHeaders = !!inReplyTo;

  // Use sendRawEmail when we have attachments, cc/bcc, or thread headers
  const useRaw = hasAttachments || hasCcOrBcc || hasThreadHeaders;

  const emailOptions = {
    to,
    cc,
    bcc,
    from,
    subject,
    text: finalText,
    html: finalHtml,
    replyTo: [from],
    inReplyTo,
    references,
    tags: [
      { Name: "EmailType", Value: "inbox-outgoing" },
      { Name: "TenantId", Value: tenant.id },
    ],
  };

  const messageId = useRaw
    ? await emailClient.sendRawEmail({
        ...emailOptions,
        attachments: attachments || [],
      })
    : await emailClient.sendEmail(emailOptions);

  console.log(`[DBG][replyEmail] Outgoing email sent. MessageId: ${messageId}`);

  return messageId || "";
}
