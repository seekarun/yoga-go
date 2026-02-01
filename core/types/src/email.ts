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
  limit?: number;
  lastKey?: string;
}
