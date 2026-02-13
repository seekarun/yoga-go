/**
 * Domain and Email Configuration Types for CallyGo BYOD
 */

/**
 * Domain configuration for Vercel hosting
 */
export interface DomainConfig {
  domain: string;
  addedAt: string;
  vercelVerified: boolean;
  vercelVerifiedAt?: string;
}

/**
 * Email configuration for SES email
 */
export interface EmailConfig {
  domainEmail: string;
  emailPrefix: string;
  sesVerificationStatus: "pending" | "verified" | "failed";
  sesDkimTokens?: string[];
  dkimVerified: boolean;
  dkimStatus?:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "NOT_STARTED"
    | "TEMPORARY_FAILURE";
  mxVerified: boolean;
  spfVerified?: boolean;
  forwardToEmail: string;
  forwardingEnabled: boolean;
  enabledAt?: string;
  verifiedAt?: string;
  aiEmail?: string; // e.g. "cal@mymusic.guru"
  forwardToCal?: boolean; // forward domain emails to Cal AI inbox
}

/**
 * API response for adding a domain
 */
export interface AddDomainResponse {
  domain: string;
  verified: boolean;
  nameservers: string[];
  verification?: Array<{
    type: "TXT" | "CNAME";
    name: string;
    value: string;
  }>;
  instructions: string;
}

/**
 * API response for domain status
 */
export interface DomainStatusResponse {
  hasDomain: boolean;
  domain?: string;
  domainConfig?: DomainConfig;
  emailConfig?: EmailConfig;
}

/**
 * API request for setting up email
 */
export interface SetupEmailRequest {
  domain: string;
  emailPrefix?: string;
  forwardToEmail: string;
}

/**
 * API response for email setup
 */
export interface SetupEmailResponse {
  domainEmail: string;
  dkimTokens: string[];
  dnsRecordsAdded: boolean;
  verificationStatus: "pending" | "verified" | "failed";
}

/**
 * API response for email verification status
 */
export interface EmailVerifyResponse {
  mxVerified: boolean;
  spfVerified: boolean;
  dkimVerified: boolean;
  dkimStatus:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "NOT_STARTED"
    | "TEMPORARY_FAILURE";
  allVerified: boolean;
}
