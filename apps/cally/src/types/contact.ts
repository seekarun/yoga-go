/**
 * Contact Form Submission Types
 * Visitors who submit the contact form on the landing page
 */

export interface ContactSubmission {
  id: string;
  email: string;
  name: string;
  message: string;
  submittedAt: string;
  flaggedAsSpam?: boolean;
  emailValidationReason?: string;
}
