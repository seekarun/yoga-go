/**
 * Contact Form Submission Types
 * Visitors who submit the contact form on the landing page
 */

import type { VisitorInfo } from "@core/types";

export interface ContactSubmission {
  id: string;
  email: string;
  name: string;
  message: string;
  submittedAt: string;
  flaggedAsSpam?: boolean;
  emailValidationReason?: string;
  visitorInfo?: VisitorInfo;
  /** ID of the configurable contact form (if submitted via one) */
  formId?: string;
  /** Dynamic field values keyed by field ID */
  formFields?: Record<string, string>;
}
