// Notification Types

import type { BaseEntity } from "./base";

/**
 * Notification type
 */
export type NotificationType =
  | "email_received"
  | "forum_thread"
  | "forum_comment"
  | "forum_reply"
  | "payment_received"
  | "new_signup"
  | "course_enrollment"
  | "system";

/**
 * Notification entity
 */
export interface Notification extends BaseEntity {
  recipientId: string;
  recipientType: "user" | "expert";
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
}
