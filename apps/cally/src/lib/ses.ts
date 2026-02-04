/**
 * SES Identity Management for BYOD (Bring Your Own Domain)
 *
 * This module handles creating and verifying SES domain identities
 * for custom domains that experts bring to the platform.
 */

import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
} from "@aws-sdk/client-sesv2";
import type { TenantDnsRecord, DkimStatus } from "@/types";

// SES is in us-west-2 for email receiving capability
const ses = new SESv2Client({ region: "us-west-2" });

const SES_REGION = "us-west-2";

export interface CreateDomainIdentityResult {
  dkimTokens: string[];
  verificationStatus:
    | "PENDING"
    | "SUCCESS"
    | "FAILED"
    | "TEMPORARY_FAILURE"
    | "NOT_STARTED";
}

export interface DomainVerificationStatus {
  verified: boolean;
  dkimStatus: DkimStatus;
  dkimTokens?: string[];
}

/**
 * Create a new SES domain identity for BYOD
 * This is called when an expert enables email for their custom domain
 */
export async function createDomainIdentity(
  domain: string,
): Promise<CreateDomainIdentityResult> {
  console.log(`[DBG][ses] Creating SES identity for domain: ${domain}`);

  try {
    const command = new CreateEmailIdentityCommand({
      EmailIdentity: domain,
      // Enable DKIM signing for better deliverability
      DkimSigningAttributes: {
        NextSigningKeyLength: "RSA_2048_BIT",
      },
    });

    const response = await ses.send(command);

    console.log(`[DBG][ses] SES identity created for ${domain}:`, {
      verifiedForSendingStatus: response.VerifiedForSendingStatus,
      dkimAttributes: response.DkimAttributes,
    });

    // Extract DKIM tokens (3 tokens needed for CNAME records)
    const dkimTokens = response.DkimAttributes?.Tokens || [];

    return {
      dkimTokens,
      verificationStatus: response.DkimAttributes?.Status || "PENDING",
    };
  } catch (error) {
    // If identity already exists, try to get its current status
    if ((error as { name?: string }).name === "AlreadyExistsException") {
      console.log(
        `[DBG][ses] Domain ${domain} already exists in SES, fetching status`,
      );
      const status = await getDomainVerificationStatus(domain);
      return {
        dkimTokens: status.dkimTokens || [],
        verificationStatus: status.dkimStatus,
      };
    }

    console.error(
      `[DBG][ses] Failed to create SES identity for ${domain}:`,
      error,
    );
    throw error;
  }
}

/**
 * Get the current verification status of a domain identity
 */
export async function getDomainVerificationStatus(
  domain: string,
): Promise<DomainVerificationStatus> {
  console.log(`[DBG][ses] Getting verification status for domain: ${domain}`);

  try {
    const command = new GetEmailIdentityCommand({
      EmailIdentity: domain,
    });

    const response = await ses.send(command);

    const dkimStatus = (response.DkimAttributes?.Status ||
      "NOT_STARTED") as DkimStatus;
    const verified = response.VerifiedForSendingStatus === true;

    console.log(`[DBG][ses] Domain ${domain} status:`, {
      verified,
      dkimStatus,
      tokens: response.DkimAttributes?.Tokens,
    });

    return {
      verified,
      dkimStatus,
      dkimTokens: response.DkimAttributes?.Tokens,
    };
  } catch (error) {
    if ((error as { name?: string }).name === "NotFoundException") {
      console.log(`[DBG][ses] Domain ${domain} not found in SES`);
      return {
        verified: false,
        dkimStatus: "NOT_STARTED",
      };
    }

    console.error(`[DBG][ses] Failed to get status for ${domain}:`, error);
    throw error;
  }
}

/**
 * Delete an SES domain identity
 * Called when expert removes their custom domain
 */
export async function deleteDomainIdentity(domain: string): Promise<void> {
  console.log(`[DBG][ses] Deleting SES identity for domain: ${domain}`);

  try {
    const command = new DeleteEmailIdentityCommand({
      EmailIdentity: domain,
    });

    await ses.send(command);
    console.log(`[DBG][ses] SES identity deleted for ${domain}`);
  } catch (error) {
    if ((error as { name?: string }).name === "NotFoundException") {
      console.log(
        `[DBG][ses] Domain ${domain} not found in SES, nothing to delete`,
      );
      return;
    }

    console.error(
      `[DBG][ses] Failed to delete SES identity for ${domain}:`,
      error,
    );
    throw error;
  }
}

/**
 * Generate the DNS records that an expert needs to add for their custom domain
 * These records enable:
 * - MX: Email receiving via SES
 * - DKIM CNAMEs: Email authentication for sending
 * - SPF TXT: Sender policy framework
 */
export function getDnsRecordsForDomain(
  domain: string,
  dkimTokens: string[],
): TenantDnsRecord[] {
  // Suppress unused warning - domain is kept for potential future use (e.g., subdomain support)
  void domain;

  const records: TenantDnsRecord[] = [];

  // MX Record for receiving emails via SES
  records.push({
    type: "MX",
    name: "@", // Root domain
    value: `inbound-smtp.${SES_REGION}.amazonaws.com`,
    priority: 10,
    purpose: "Email receiving - Routes incoming emails to AWS SES",
  });

  // SPF TXT Record
  records.push({
    type: "TXT",
    name: "@", // Root domain
    value: "v=spf1 include:amazonses.com ~all",
    purpose:
      "SPF - Authorizes Amazon SES to send emails on behalf of your domain",
  });

  // DKIM CNAME Records (3 records)
  dkimTokens.forEach((token, index) => {
    records.push({
      type: "CNAME",
      name: `${token}._domainkey`,
      value: `${token}.dkim.amazonses.com`,
      purpose: `DKIM ${index + 1} - Email authentication signature`,
    });
  });

  return records;
}

/**
 * Verify MX record points to SES
 * Uses DNS lookup to check if MX is correctly configured
 */
export async function verifyMxRecord(domain: string): Promise<boolean> {
  console.log(`[DBG][ses] Verifying MX record for domain: ${domain}`);

  try {
    // Use Node.js dns module for lookup
    const dns = await import("dns").then((m) => m.promises);
    const mxRecords = await dns.resolveMx(domain);

    const hasSesMx = mxRecords.some(
      (mx) =>
        mx.exchange.toLowerCase().includes("inbound-smtp") &&
        mx.exchange.toLowerCase().includes("amazonaws.com"),
    );

    console.log(`[DBG][ses] MX records for ${domain}:`, mxRecords);
    console.log(`[DBG][ses] MX verification result: ${hasSesMx}`);

    return hasSesMx;
  } catch (error) {
    console.error(`[DBG][ses] MX verification failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Verify SPF record is correctly configured
 */
export async function verifySpfRecord(domain: string): Promise<boolean> {
  console.log(`[DBG][ses] Verifying SPF record for domain: ${domain}`);

  try {
    const dns = await import("dns").then((m) => m.promises);
    const txtRecords = await dns.resolveTxt(domain);

    // Flatten the TXT records (they come as arrays of strings)
    const flatRecords = txtRecords.map((r) => r.join(""));

    const hasSpf = flatRecords.some(
      (record) => record.includes("v=spf1") && record.includes("amazonses.com"),
    );

    console.log(`[DBG][ses] TXT records for ${domain}:`, flatRecords);
    console.log(`[DBG][ses] SPF verification result: ${hasSpf}`);

    return hasSpf;
  } catch (error) {
    console.error(`[DBG][ses] SPF verification failed for ${domain}:`, error);
    return false;
  }
}

/**
 * Comprehensive verification of all DNS records for BYOD email
 * Returns detailed status of each record type
 */
export async function verifyAllDnsRecords(domain: string): Promise<{
  mxVerified: boolean;
  spfVerified: boolean;
  dkimStatus: DkimStatus;
  dkimVerified: boolean;
  allVerified: boolean;
}> {
  console.log(`[DBG][ses] Verifying all DNS records for domain: ${domain}`);

  // Check DNS records in parallel
  const [mxVerified, spfVerified, sesStatus] = await Promise.all([
    verifyMxRecord(domain),
    verifySpfRecord(domain),
    getDomainVerificationStatus(domain),
  ]);

  const dkimVerified = sesStatus.dkimStatus === "SUCCESS";
  const allVerified = mxVerified && spfVerified && dkimVerified;

  console.log(`[DBG][ses] DNS verification summary for ${domain}:`, {
    mxVerified,
    spfVerified,
    dkimStatus: sesStatus.dkimStatus,
    dkimVerified,
    allVerified,
  });

  return {
    mxVerified,
    spfVerified,
    dkimStatus: sesStatus.dkimStatus,
    dkimVerified,
    allVerified,
  };
}
