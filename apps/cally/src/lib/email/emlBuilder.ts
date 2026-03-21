/**
 * EML Builder - Constructs RFC 2822 compliant .eml files
 *
 * Builds self-contained email files with embedded attachments
 * that can be imported into Thunderbird, Apple Mail, Outlook, Gmail, etc.
 */

import type { Email, EmailAttachment } from "@/types";

/** Attachment with fetched content */
export interface AttachmentBuffer {
  attachment: EmailAttachment;
  buffer: Buffer;
}

const CRLF = "\r\n";

/**
 * RFC 2047 encode a header value if it contains non-ASCII characters
 */
const encodeHeader = (value: string): string => {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  const encoded = Buffer.from(value, "utf-8").toString("base64");
  return `=?UTF-8?B?${encoded}?=`;
};

/**
 * Format an email address for MIME headers
 */
const formatAddress = (addr: { name?: string; email: string }): string =>
  addr.name ? `${encodeHeader(addr.name)} <${addr.email}>` : addr.email;

/**
 * Format a list of email addresses
 */
const formatAddressList = (addrs: { name?: string; email: string }[]): string =>
  addrs.map(formatAddress).join(", ");

/**
 * Generate a MIME boundary string
 */
const generateBoundary = (prefix: string): string =>
  `----=${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

/**
 * Wrap base64 string to 76 characters per line (RFC 2045)
 */
const wrapBase64 = (b64: string): string => {
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.substring(i, i + 76));
  }
  return lines.join(CRLF);
};

/**
 * Build a complete .eml file from an Email record and its attachment buffers.
 * Returns a string in RFC 2822 / MIME format.
 */
export const buildEml = (
  email: Email,
  attachmentBuffers: AttachmentBuffer[] = [],
): string => {
  const mixedBoundary = generateBoundary("mixed");
  const altBoundary = generateBoundary("alt");

  const hasAttachments = attachmentBuffers.length > 0;
  const hasHtml = !!email.bodyHtml;

  // Build headers
  const headers: string[] = [];
  headers.push("MIME-Version: 1.0");
  headers.push(`Date: ${new Date(email.receivedAt).toUTCString()}`);
  headers.push(`From: ${formatAddress(email.from)}`);
  headers.push(`To: ${formatAddressList(email.to)}`);

  if (email.cc && email.cc.length > 0) {
    headers.push(`Cc: ${formatAddressList(email.cc)}`);
  }

  headers.push(`Subject: ${encodeHeader(email.subject)}`);

  if (email.messageId) {
    headers.push(`Message-ID: ${email.messageId}`);
  }

  if (email.inReplyTo) {
    headers.push(`In-Reply-To: ${email.inReplyTo}`);
  }

  if (email.threadId) {
    headers.push(`References: ${email.threadId}`);
  }

  // Determine content type structure
  if (hasAttachments) {
    headers.push(`Content-Type: multipart/mixed; boundary="${mixedBoundary}"`);
  } else if (hasHtml) {
    headers.push(
      `Content-Type: multipart/alternative; boundary="${altBoundary}"`,
    );
  } else {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    headers.push("Content-Transfer-Encoding: quoted-printable");
  }

  let eml = headers.join(CRLF) + CRLF + CRLF;

  // Simple text-only email (no attachments, no HTML)
  if (!hasAttachments && !hasHtml) {
    eml += email.bodyText || "";
    return eml;
  }

  // Build body parts
  const buildAlternativePart = (): string => {
    let part = "";

    // Plain text part
    part += `--${altBoundary}${CRLF}`;
    part += `Content-Type: text/plain; charset="UTF-8"${CRLF}`;
    part += `Content-Transfer-Encoding: quoted-printable${CRLF}${CRLF}`;
    part += (email.bodyText || "") + CRLF;

    // HTML part
    if (hasHtml) {
      part += `--${altBoundary}${CRLF}`;
      part += `Content-Type: text/html; charset="UTF-8"${CRLF}`;
      part += `Content-Transfer-Encoding: quoted-printable${CRLF}${CRLF}`;
      part += email.bodyHtml + CRLF;
    }

    part += `--${altBoundary}--${CRLF}`;
    return part;
  };

  if (hasAttachments) {
    // multipart/mixed wrapper
    eml += `This is a multi-part message in MIME format.${CRLF}${CRLF}`;

    // Body part (alternative or plain)
    eml += `--${mixedBoundary}${CRLF}`;
    if (hasHtml) {
      eml += `Content-Type: multipart/alternative; boundary="${altBoundary}"${CRLF}${CRLF}`;
      eml += buildAlternativePart();
    } else {
      eml += `Content-Type: text/plain; charset="UTF-8"${CRLF}`;
      eml += `Content-Transfer-Encoding: quoted-printable${CRLF}${CRLF}`;
      eml += (email.bodyText || "") + CRLF;
    }

    // Attachment parts
    for (const { attachment, buffer } of attachmentBuffers) {
      const b64 = wrapBase64(buffer.toString("base64"));
      eml += `--${mixedBoundary}${CRLF}`;
      eml += `Content-Type: ${attachment.mimeType}; name="${encodeHeader(attachment.filename)}"${CRLF}`;
      eml += `Content-Transfer-Encoding: base64${CRLF}`;

      if (attachment.contentId) {
        eml += `Content-ID: <${attachment.contentId}>${CRLF}`;
        eml += `Content-Disposition: inline; filename="${encodeHeader(attachment.filename)}"${CRLF}`;
      } else {
        eml += `Content-Disposition: attachment; filename="${encodeHeader(attachment.filename)}"${CRLF}`;
      }

      eml += CRLF + b64 + CRLF;
    }

    eml += `--${mixedBoundary}--${CRLF}`;
  } else {
    // multipart/alternative only (has HTML but no attachments)
    eml += buildAlternativePart();
  }

  return eml;
};
