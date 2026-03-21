/**
 * EML / MBOX Parser - Parses .eml and .mbox files into our Email format
 *
 * Uses mailparser for robust RFC 2822 parsing.
 * Handles both individual .eml files and concatenated .mbox archives.
 */

import { simpleParser } from "mailparser";
import type { ParsedMail } from "mailparser";
import type { EmailAddress, EmailAttachment } from "@/types";
import type { CreateEmailInput } from "@/lib/repositories/emailRepository";

/** Parsed email with extracted attachment buffers for S3 upload */
export interface ParsedEmailResult {
  email: Omit<CreateEmailInput, "expertId">;
  attachmentBuffers: { meta: EmailAttachment; buffer: Buffer }[];
}

/**
 * Parse a mailparser address into our EmailAddress format
 */
const parseAddress = (addr: {
  name?: string;
  address?: string;
}): EmailAddress | null => {
  if (!addr.address) return null;
  return { name: addr.name || undefined, email: addr.address };
};

/**
 * Extract EmailAddress[] from mailparser address objects
 */
const extractAddresses = (
  value: ParsedMail["from"] | ParsedMail["to"],
): EmailAddress[] => {
  if (!value) return [];
  const addrs: EmailAddress[] = [];
  for (const group of Array.isArray(value) ? value : [value]) {
    if (group.value) {
      for (const addr of group.value) {
        const parsed = parseAddress(addr);
        if (parsed) addrs.push(parsed);
      }
    }
  }
  return addrs;
};

/**
 * Generate a unique ID for an imported email
 */
const generateId = (): string =>
  `imp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

/**
 * Parse a single .eml file content into our format
 */
export const parseEml = async (
  emlContent: string | Buffer,
): Promise<ParsedEmailResult> => {
  const parsed = await simpleParser(emlContent);

  const fromAddrs = extractAddresses(parsed.from);
  const toAddrs = extractAddresses(parsed.to);
  const ccAddrs = extractAddresses(parsed.cc);

  const emailId = generateId();
  const attachmentBuffers: ParsedEmailResult["attachmentBuffers"] = [];
  const attachmentMeta: EmailAttachment[] = [];

  if (parsed.attachments) {
    for (const att of parsed.attachments) {
      const attId = `${emailId}_att_${attachmentBuffers.length}`;
      // s3Key is set as placeholder — the import route fills in the real key after upload
      const meta: EmailAttachment = {
        id: attId,
        filename: att.filename || `attachment_${attachmentBuffers.length}`,
        mimeType: att.contentType || "application/octet-stream",
        size: att.size,
        s3Key: "", // filled by import route after S3 upload
        contentId: att.contentId || undefined,
      };
      attachmentMeta.push(meta);
      attachmentBuffers.push({ meta, buffer: att.content });
    }
  }

  const receivedAt = parsed.date?.toISOString() || new Date().toISOString();

  // Detect if this was an outgoing email (Sent folder heuristic)
  // mailparser doesn't have folder info, so we leave isOutgoing as false
  // and let the user's existing folder assignment handle it

  const email: Omit<CreateEmailInput, "expertId"> = {
    id: emailId,
    messageId: parsed.messageId || `<imported-${emailId}@cally-import>`,
    threadId: parsed.references
      ? Array.isArray(parsed.references)
        ? parsed.references[0]
        : parsed.references
      : undefined,
    inReplyTo: parsed.inReplyTo,
    from: fromAddrs[0] || { email: "unknown@import" },
    to: toAddrs.length > 0 ? toAddrs : [{ email: "unknown@import" }],
    cc: ccAddrs.length > 0 ? ccAddrs : undefined,
    subject: parsed.subject || "(No Subject)",
    bodyText: parsed.text || "",
    bodyHtml: parsed.html || undefined,
    attachments: attachmentMeta,
    receivedAt,
    isOutgoing: false,
    status: "received",
  };

  return { email, attachmentBuffers };
};

/**
 * Split an MBOX file into individual email strings.
 * MBOX format: emails separated by lines starting with "From " (RFC 4155).
 * Handles "From " escaping (lines starting with ">From " in body).
 */
export const splitMbox = (mboxContent: string): string[] => {
  const emails: string[] = [];
  const lines = mboxContent.split(/\r?\n/);
  let currentEmail: string[] = [];

  for (const line of lines) {
    // MBOX separator: "From " followed by an email address and date
    // Only match at the boundary (not ">From " which is escaped body content)
    if (/^From \S/.test(line) && currentEmail.length > 0) {
      emails.push(currentEmail.join("\n"));
      currentEmail = [];
      // Skip the "From " separator line — it's not part of the email
      continue;
    }

    if (/^From \S/.test(line) && currentEmail.length === 0) {
      // First email starts — skip the separator
      continue;
    }

    // Unescape "From " munging: ">From " at start of line → "From "
    if (line.startsWith(">From ")) {
      currentEmail.push(line.substring(1));
    } else {
      currentEmail.push(line);
    }
  }

  // Don't forget the last email
  if (currentEmail.length > 0) {
    const content = currentEmail.join("\n").trim();
    if (content) emails.push(content);
  }

  return emails;
};

/**
 * Parse an MBOX file into multiple emails
 */
export const parseMbox = async (
  mboxContent: string,
): Promise<ParsedEmailResult[]> => {
  const rawEmails = splitMbox(mboxContent);
  const results: ParsedEmailResult[] = [];

  for (const raw of rawEmails) {
    try {
      const result = await parseEml(raw);
      results.push(result);
    } catch (err) {
      console.error(
        "[DBG][emlParser] Failed to parse email from mbox, skipping:",
        err,
      );
    }
  }

  return results;
};
