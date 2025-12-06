/**
 * AWS SES Email Verification
 *
 * Provides functions to verify custom email addresses with AWS SES.
 * Used by experts who want to send emails from their own domain.
 */

import {
  SESClient,
  VerifyEmailIdentityCommand,
  GetIdentityVerificationAttributesCommand,
  DeleteIdentityCommand,
} from '@aws-sdk/client-ses';

const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'ap-southeast-2',
});

export type VerificationStatus = 'Pending' | 'Success' | 'Failed' | 'NotStarted';

/**
 * Get the default email address for an expert
 */
export function getExpertDefaultEmail(expertId: string): string {
  return `${expertId}@myyoga.guru`;
}

/**
 * Initiate email verification for a custom email address
 * AWS SES will send a verification email to this address
 *
 * @param email - The email address to verify
 * @returns Promise with success status
 */
export async function initiateEmailVerification(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('[DBG][ses-verification] Initiating email verification for:', email);

  try {
    const command = new VerifyEmailIdentityCommand({
      EmailAddress: email,
    });

    await sesClient.send(command);

    console.log('[DBG][ses-verification] Verification email sent to:', email);
    return { success: true };
  } catch (error) {
    console.error('[DBG][ses-verification] Error initiating verification:', error);
    const message = error instanceof Error ? error.message : 'Failed to initiate verification';
    return { success: false, error: message };
  }
}

/**
 * Check the verification status of an email address
 *
 * @param email - The email address to check
 * @returns Promise with verification status
 */
export async function getEmailVerificationStatus(email: string): Promise<{
  status: VerificationStatus;
  error?: string;
}> {
  console.log('[DBG][ses-verification] Checking verification status for:', email);

  try {
    const command = new GetIdentityVerificationAttributesCommand({
      Identities: [email],
    });

    const response = await sesClient.send(command);
    const attributes = response.VerificationAttributes?.[email];

    if (!attributes) {
      console.log('[DBG][ses-verification] No verification attributes found');
      return { status: 'NotStarted' };
    }

    const status = attributes.VerificationStatus;
    console.log('[DBG][ses-verification] Verification status:', status);

    // Map SES status to our status type
    switch (status) {
      case 'Pending':
        return { status: 'Pending' };
      case 'Success':
        return { status: 'Success' };
      case 'Failed':
        return { status: 'Failed' };
      default:
        return { status: 'NotStarted' };
    }
  } catch (error) {
    console.error('[DBG][ses-verification] Error checking verification:', error);
    const message = error instanceof Error ? error.message : 'Failed to check verification';
    return { status: 'NotStarted', error: message };
  }
}

/**
 * Delete an email identity from SES
 * Use this when expert removes their custom email
 *
 * @param email - The email address to remove
 * @returns Promise with success status
 */
export async function deleteEmailIdentity(email: string): Promise<{
  success: boolean;
  error?: string;
}> {
  console.log('[DBG][ses-verification] Deleting email identity:', email);

  try {
    const command = new DeleteIdentityCommand({
      Identity: email,
    });

    await sesClient.send(command);

    console.log('[DBG][ses-verification] Email identity deleted:', email);
    return { success: true };
  } catch (error) {
    console.error('[DBG][ses-verification] Error deleting identity:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete identity';
    return { success: false, error: message };
  }
}

/**
 * Get the email address to use for sending emails for an expert
 * Returns custom email if verified, otherwise returns default
 *
 * @param expertId - The expert ID
 * @param customEmail - Optional custom email to check
 * @param emailVerified - Whether the custom email is marked as verified
 * @returns The email address to use for sending
 */
export function getExpertSendFromEmail(
  expertId: string,
  customEmail?: string,
  emailVerified?: boolean
): string {
  // If custom email is set and verified, use it
  if (customEmail && emailVerified) {
    return customEmail;
  }

  // Otherwise use default expert email
  return getExpertDefaultEmail(expertId);
}
