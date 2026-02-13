/**
 * Waitlist Types
 * Visitors join a waitlist for a given date when all slots are booked.
 * Notified in FIFO order when a cancellation opens a slot.
 */

export type WaitlistStatus = "waiting" | "notified" | "booked" | "expired";

export interface WaitlistEntry {
  id: string;
  tenantId: string;
  /** YYYY-MM-DD */
  date: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string;
  status: WaitlistStatus;
  /** 1-based position in the queue for that date */
  position: number;
  createdAt: string;
  notifiedAt?: string;
  /** When the notification window expires (notifiedAt + 10 min) */
  expiresAt?: string;
  bookedAt?: string;
}
