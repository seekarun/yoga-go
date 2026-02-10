/**
 * Feedback Request Types
 *
 * Feedback flow:
 * 1. Tenant requests feedback from a user (creates pending request)
 * 2. User receives email with link to public feedback form
 * 3. User submits rating + message via the form
 * 4. Tenant reviews and approves for landing page display
 */

export interface FeedbackRequest {
  id: string;
  tenantId: string;
  recipientEmail: string;
  recipientName: string;
  customMessage?: string;
  token: string;
  status: "pending" | "submitted";
  createdAt: string;
  submittedAt?: string;
  // Submitted feedback data
  rating?: number;
  message?: string;
  consentToShowcase?: boolean;
  // Tenant review
  approved?: boolean;
  approvedAt?: string;
  // Remind tracking
  remindCount?: number;
  lastRemindedAt?: string;
}
