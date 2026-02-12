/**
 * Stripe Connect Types for CallyGo
 */

export interface StripeConfig {
  accountId: string; // Stripe Connected Account ID (acct_xxx)
  chargesEnabled: boolean; // Can the account accept charges?
  detailsSubmitted: boolean; // Has onboarding been completed?
  email?: string; // Stripe account email
  applicationFeePercent?: number; // Platform fee percentage
  connectedAt: string; // ISO 8601
}
