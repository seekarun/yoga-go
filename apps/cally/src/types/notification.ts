/**
 * Notification Types for Cally
 *
 * Generic notification system supporting email, booking, payment,
 * subscriber, and system notifications.
 */

export type CallyNotificationType =
  | "email_received"
  | "booking_created"
  | "booking_cancelled"
  | "payment_received"
  | "new_subscriber"
  | "system";

export interface CallyNotification {
  id: string;
  recipientId: string;
  type: CallyNotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
