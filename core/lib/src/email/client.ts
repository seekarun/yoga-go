// Core Email Client - AWS SES

import {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} from "@aws-sdk/client-ses";
import type {
  EmailClientConfig,
  EmailClient,
  EmailOptions,
  RawEmailOptions,
} from "./types";

/**
 * Create a reusable email client backed by AWS SES
 */
export function createEmailClient(config: EmailClientConfig): EmailClient {
  const { region = "us-west-2", fromEmail, configSet } = config;

  const sesClient = new SESClient({ region });

  console.log(
    `[DBG][core-email] SES client initialized (region=${region}, from=${fromEmail})`,
  );

  return {
    async sendEmail(options: EmailOptions): Promise<string | undefined> {
      const {
        to,
        cc,
        bcc,
        from = fromEmail,
        subject,
        text,
        html,
        tags = [{ Name: "EmailType", Value: "transactional" }],
        replyTo,
      } = options;

      const recipients = Array.isArray(to) ? to : [to];
      const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : undefined;
      const bccRecipients = bcc
        ? Array.isArray(bcc)
          ? bcc
          : [bcc]
        : undefined;

      console.log(
        `[DBG][core-email] Sending email to ${recipients.join(", ")}`,
      );
      console.log(`[DBG][core-email] Subject: ${subject}`);

      const command = new SendEmailCommand({
        Source: from,
        Destination: {
          ToAddresses: recipients,
          ...(ccRecipients && ccRecipients.length > 0
            ? { CcAddresses: ccRecipients }
            : {}),
          ...(bccRecipients && bccRecipients.length > 0
            ? { BccAddresses: bccRecipients }
            : {}),
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Text: {
              Data: text,
              Charset: "UTF-8",
            },
            Html: {
              Data: html || text.replace(/\n/g, "<br>"),
              Charset: "UTF-8",
            },
          },
        },
        ConfigurationSetName: configSet,
        Tags: tags,
        ...(replyTo && replyTo.length > 0 ? { ReplyToAddresses: replyTo } : {}),
      });

      try {
        const response = await sesClient.send(command);
        console.log(
          `[DBG][core-email] Email sent. MessageId: ${response.MessageId}`,
        );
        return response.MessageId;
      } catch (error) {
        console.error("[DBG][core-email] Error sending email:", error);
        if (error && typeof error === "object") {
          const awsError = error as {
            name?: string;
            message?: string;
            Code?: string;
            $metadata?: unknown;
          };
          console.error("[DBG][core-email] AWS Error name:", awsError.name);
          console.error(
            "[DBG][core-email] AWS Error message:",
            awsError.message,
          );
          console.error("[DBG][core-email] AWS Error code:", awsError.Code);
          console.error(
            "[DBG][core-email] AWS metadata:",
            JSON.stringify(awsError.$metadata),
          );
        }
        throw error;
      }
    },

    async sendRawEmail(options: RawEmailOptions): Promise<string | undefined> {
      const {
        to,
        cc,
        bcc,
        from = fromEmail,
        subject,
        text,
        html,
        replyTo,
        inReplyTo,
        references,
        attachments = [],
      } = options;

      const recipients = Array.isArray(to) ? to : [to];
      const ccRecipients = cc ? (Array.isArray(cc) ? cc : [cc]) : [];
      const bccRecipients = bcc ? (Array.isArray(bcc) ? bcc : [bcc]) : [];
      const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`;

      console.log(
        `[DBG][core-email] Sending raw email with ${attachments.length} attachment(s) to ${recipients.join(", ")}`,
      );

      // Build MIME message
      const lines: string[] = [];
      lines.push(`From: ${from}`);
      lines.push(`To: ${recipients.join(", ")}`);
      if (ccRecipients.length > 0) {
        lines.push(`Cc: ${ccRecipients.join(", ")}`);
      }
      // BCC recipients are NOT added to MIME headers, only to Destinations
      lines.push(`Subject: ${subject}`);
      if (replyTo && replyTo.length > 0) {
        lines.push(`Reply-To: ${replyTo.join(", ")}`);
      }
      if (inReplyTo) {
        lines.push(`In-Reply-To: ${inReplyTo}`);
      }
      if (references && references.length > 0) {
        lines.push(`References: ${references.join(" ")}`);
      }
      lines.push("MIME-Version: 1.0");
      lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
      lines.push("");

      // Text/HTML body part
      const bodyBoundary = `----=_Alt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      lines.push(`--${boundary}`);
      lines.push(
        `Content-Type: multipart/alternative; boundary="${bodyBoundary}"`,
      );
      lines.push("");

      // Plain text
      lines.push(`--${bodyBoundary}`);
      lines.push("Content-Type: text/plain; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: 7bit");
      lines.push("");
      lines.push(text);
      lines.push("");

      // HTML
      const htmlBody = html || text.replace(/\n/g, "<br>");
      lines.push(`--${bodyBoundary}`);
      lines.push("Content-Type: text/html; charset=UTF-8");
      lines.push("Content-Transfer-Encoding: 7bit");
      lines.push("");
      lines.push(htmlBody);
      lines.push("");
      lines.push(`--${bodyBoundary}--`);
      lines.push("");

      // Attachment parts
      for (const att of attachments) {
        lines.push(`--${boundary}`);
        lines.push(`Content-Type: ${att.contentType}; name="${att.filename}"`);
        lines.push("Content-Transfer-Encoding: base64");
        lines.push(
          `Content-Disposition: attachment; filename="${att.filename}"`,
        );
        lines.push("");
        lines.push(att.content.toString("base64"));
        lines.push("");
      }

      lines.push(`--${boundary}--`);

      const rawMessage = lines.join("\r\n");

      // Include all recipients (to + cc + bcc) in Destinations
      const allDestinations = [
        ...recipients,
        ...ccRecipients,
        ...bccRecipients,
      ];

      const command = new SendRawEmailCommand({
        RawMessage: {
          Data: Buffer.from(rawMessage),
        },
        Destinations: allDestinations,
      });

      try {
        const response = await sesClient.send(command);
        console.log(
          `[DBG][core-email] Raw email sent. MessageId: ${response.MessageId}`,
        );
        return response.MessageId;
      } catch (error) {
        console.error("[DBG][core-email] Error sending raw email:", error);
        throw error;
      }
    },
  };
}
