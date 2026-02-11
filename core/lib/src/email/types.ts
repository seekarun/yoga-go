// Core Email Types

/**
 * Configuration for creating an email client
 */
export interface EmailClientConfig {
  region?: string;
  fromEmail: string;
  configSet?: string;
}

/**
 * Options for sending a single email
 */
export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  text: string;
  html?: string;
  tags?: Array<{ Name: string; Value: string }>;
  replyTo?: string[];
}

/**
 * Attachment input for sending emails with files
 */
export interface EmailAttachmentInput {
  filename: string;
  content: Buffer;
  contentType: string;
}

/**
 * Options for sending an email with attachments (requires raw MIME)
 */
export interface RawEmailOptions extends EmailOptions {
  attachments?: EmailAttachmentInput[];
}

/**
 * Email client interface
 */
export interface EmailClient {
  sendEmail(options: EmailOptions): Promise<string | undefined>;
  sendRawEmail(options: RawEmailOptions): Promise<string | undefined>;
}
