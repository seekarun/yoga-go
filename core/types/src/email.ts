// Email Types - Email inbox types

import type { BaseEntity } from "./base";

/**
 * Email address with optional display name
 */
export interface EmailAddress {
  name?: string;
  email: string;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  s3Key: string;
  contentId?: string;
}

/**
 * Email entity
 */
export interface Email extends BaseEntity {
  expertId: string;
  messageId: string;
  threadId?: string;
  inReplyTo?: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments: EmailAttachment[];
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
  isOutgoing: boolean;
  status: "received" | "sent" | "failed";
  errorMessage?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
  labels?: string[];
  ttl?: number;
}

/**
 * Email with thread metadata
 */
export interface EmailWithThread extends Email {
  threadCount?: number;
  threadHasUnread?: boolean;
  threadLatestAt?: string;
  threadMessages?: Email[];
}

/**
 * Email list result
 */
export interface EmailListResult {
  emails: EmailWithThread[];
  totalCount: number;
  unreadCount: number;
  lastKey?: string;
}

/**
 * Email filters
 */
export interface EmailFilters {
  unreadOnly?: boolean;
  starredOnly?: boolean;
  search?: string;
  folder?: "inbox" | "sent" | "trash" | "archive";
  labelId?: string;
  from?: string;
  to?: string;
  hasAttachment?: boolean;
  after?: string;
  before?: string;
  limit?: number;
  lastKey?: string;
}

/**
 * Email draft
 */
export interface EmailDraft {
  id: string;
  expertId: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  attachments?: EmailAttachment[];
  mode: "compose" | "reply" | "reply-all" | "forward";
  replyToEmailId?: string;
  forwardOfEmailId?: string;
  lastSavedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Email draft list result
 */
export interface EmailDraftListResult {
  drafts: EmailDraft[];
  totalCount: number;
}

/**
 * Email signature config
 */
export interface EmailSignatureConfig {
  text: string;
  html: string;
  enabled: boolean;
}

/**
 * Email label for organizing emails
 */
export interface EmailLabel {
  id: string;
  name: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}
