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
 * Email client interface
 */
export interface EmailClient {
  sendEmail(options: EmailOptions): Promise<string | undefined>;
}
