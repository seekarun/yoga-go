import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { SESClient, SendRawEmailCommand } from "@aws-sdk/client-ses";
import {
  DynamoDBClient,
  QueryCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { SESEvent, SESEventRecord } from "aws-lambda";

const s3 = new S3Client({});
const ses = new SESClient({});
// DynamoDB is in ap-southeast-2
const dynamodb = new DynamoDBClient({ region: "ap-southeast-2" });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "yoga-go-core";
const BUCKET_NAME = process.env.EMAIL_BUCKET || "";
const DEFAULT_FROM = process.env.DEFAULT_FROM_EMAIL || "hi@myyoga.guru";
const PLATFORM_DOMAIN = "myyoga.guru";

// Platform admin emails (comma-separated list)
// Emails to platform addresses (hi@, contact@, privacy@, etc.) will be forwarded to these addresses
const PLATFORM_ADMIN_EMAILS = process.env.PLATFORM_ADMIN_EMAILS
  ? process.env.PLATFORM_ADMIN_EMAILS.split(",").map((e) => e.trim())
  : [];

// Platform email addresses that should be forwarded to admin(s)
const PLATFORM_FORWARDED_EMAILS = ["hi", "contact", "privacy"];

// Platform email addresses that should NOT be forwarded (system emails)
const PLATFORM_SYSTEM_EMAILS = ["support", "info", "admin", "noreply", "mail"];

interface ExpertData {
  forwardingEmail?: string;
  emailForwardingEnabled?: boolean;
}

// Tenant email config for BYOD domains
interface TenantEmailConfig {
  domainEmail?: string;
  forwardToEmail?: string;
  forwardingEnabled?: boolean;
  sesVerificationStatus?: string;
}

interface TenantData {
  id: string;
  expertId: string;
  primaryDomain: string;
  emailConfig?: TenantEmailConfig;
}

/**
 * Get tenant by domain from DynamoDB
 * Key pattern: PK = "TENANT#DOMAIN#{domain}", SK = {domain}
 */
async function getTenantByDomain(domain: string): Promise<TenantData | null> {
  const normalizedDomain = domain.toLowerCase();
  console.log(
    `[DBG][email-forwarder] Looking up tenant by domain: ${normalizedDomain}`,
  );

  // First look up domain reference to get tenant ID
  const domainResult = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: `TENANT#DOMAIN#${normalizedDomain}` },
        SK: { S: normalizedDomain },
      },
    }),
  );

  if (!domainResult.Item) {
    console.log(`[DBG][email-forwarder] Domain not found: ${normalizedDomain}`);
    return null;
  }

  const tenantId = domainResult.Item.tenantId?.S;
  if (!tenantId) {
    console.log(
      `[DBG][email-forwarder] No tenantId for domain: ${normalizedDomain}`,
    );
    return null;
  }

  // Now get the actual tenant record
  const tenantResult = await dynamodb.send(
    new GetItemCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: { S: "TENANT" },
        SK: { S: tenantId },
      },
    }),
  );

  if (!tenantResult.Item) {
    console.log(`[DBG][email-forwarder] Tenant not found: ${tenantId}`);
    return null;
  }

  const item = tenantResult.Item;
  const emailConfigMap = item.emailConfig?.M;

  console.log(
    `[DBG][email-forwarder] Found tenant: ${tenantId}, hasEmailConfig: ${!!emailConfigMap}`,
  );

  return {
    id: item.id?.S || tenantId,
    expertId: item.expertId?.S || "",
    primaryDomain: item.primaryDomain?.S || "",
    emailConfig: emailConfigMap
      ? {
          domainEmail: emailConfigMap.domainEmail?.S,
          forwardToEmail: emailConfigMap.forwardToEmail?.S,
          forwardingEnabled: emailConfigMap.forwardingEnabled?.BOOL ?? true,
          sesVerificationStatus: emailConfigMap.sesVerificationStatus?.S,
        }
      : undefined,
  };
}

/**
 * Get expert data from DynamoDB
 * Key pattern: PK = "EXPERT", SK = expertId
 */
async function getExpert(expertId: string): Promise<ExpertData | null> {
  console.log(`[DBG][email-forwarder] Looking up expert: ${expertId}`);

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": { S: "EXPERT" },
        ":sk": { S: expertId },
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log(`[DBG][email-forwarder] Expert not found: ${expertId}`);
    return null;
  }

  const item = result.Items[0];
  const platformPreferences = item.platformPreferences?.M;

  console.log(
    `[DBG][email-forwarder] Found expert: ${expertId}, forwarding: ${platformPreferences?.forwardingEmail?.S}`,
  );

  return {
    forwardingEmail: platformPreferences?.forwardingEmail?.S,
    emailForwardingEnabled:
      platformPreferences?.emailForwardingEnabled?.BOOL ?? true,
  };
}

/**
 * Get raw email content from S3
 */
async function getEmailFromS3(messageId: string): Promise<string> {
  console.log(
    `[DBG][email-forwarder] Fetching email from S3: incoming/${messageId}`,
  );

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `incoming/${messageId}`,
    }),
  );

  const body = await response.Body?.transformToString();
  if (!body) {
    throw new Error("Empty email body");
  }

  return body;
}

/**
 * Forward email to the expert's personal email
 * @param rawEmail - Raw email content from S3
 * @param forwardTo - Email address to forward to
 * @param originalRecipient - Original recipient email address
 * @param originalSender - Original sender email address
 * @param sourceDomain - Domain to send from (for BYOD, defaults to platform)
 */
async function forwardEmail(
  rawEmail: string,
  forwardTo: string,
  originalRecipient: string,
  originalSender: string,
  sourceDomain?: string,
): Promise<void> {
  // Determine the From address - use BYOD domain if provided
  const fromEmail = sourceDomain ? `noreply@${sourceDomain}` : DEFAULT_FROM;

  console.log(
    `[DBG][email-forwarder] Forwarding email to: ${forwardTo} from: ${fromEmail}`,
  );

  // Parse and modify email headers for forwarding
  // We need to:
  // 1. Change the To: header to the forwarding address
  // 2. Add X-Original-To: header with original recipient
  // 3. Set the From: to our verified domain (required by SES)
  // 4. Add Reply-To: with original sender
  const lines = rawEmail.split("\r\n");
  const modifiedLines: string[] = [];
  let inHeaders = true;
  let addedHeaders = false;

  for (const line of lines) {
    if (inHeaders) {
      if (line === "") {
        // End of headers - add our custom headers before the empty line
        if (!addedHeaders) {
          modifiedLines.push(`X-Original-To: ${originalRecipient}`);
          modifiedLines.push(`X-Forwarded-For: ${originalRecipient}`);
          addedHeaders = true;
        }
        inHeaders = false;
        modifiedLines.push(line);
      } else if (line.toLowerCase().startsWith("to:")) {
        // Replace To: header
        modifiedLines.push(`To: ${forwardTo}`);
      } else if (line.toLowerCase().startsWith("from:")) {
        // Keep original From but add Reply-To
        modifiedLines.push(line);
        modifiedLines.push(`Reply-To: ${originalSender}`);
      } else if (line.toLowerCase().startsWith("return-path:")) {
        // Update Return-Path to our domain
        modifiedLines.push(`Return-Path: <${fromEmail}>`);
      } else if (
        line.toLowerCase().startsWith("dkim-signature:") ||
        line.toLowerCase().startsWith("domainkey-signature:")
      ) {
        // Skip DKIM signatures as they won't be valid after modification
        continue;
      } else {
        modifiedLines.push(line);
      }
    } else {
      modifiedLines.push(line);
    }
  }

  const modifiedEmail = modifiedLines.join("\r\n");

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(modifiedEmail) },
      Source: fromEmail,
      Destinations: [forwardTo],
    }),
  );

  console.log(
    `[DBG][email-forwarder] Email forwarded successfully to ${forwardTo}`,
  );
}

/**
 * Lambda handler for SES incoming email events
 */
export async function handler(event: SESEvent): Promise<void> {
  console.log(
    `[DBG][email-forwarder] Processing ${event.Records.length} email(s)`,
  );

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error("[DBG][email-forwarder] Error processing record:", error);
      // Continue processing other records even if one fails
    }
  }
}

/**
 * Handle platform email (myyoga.guru)
 */
async function handlePlatformEmail(
  localPart: string,
  recipient: string,
  mail: SESEventRecord["ses"]["mail"],
): Promise<void> {
  // Check if this is a platform email that should be forwarded to admin(s)
  if (PLATFORM_FORWARDED_EMAILS.includes(localPart)) {
    if (PLATFORM_ADMIN_EMAILS.length === 0) {
      console.log(
        `[DBG][email-forwarder] No admin emails configured, skipping platform email: ${recipient}`,
      );
      return;
    }

    console.log(
      `[DBG][email-forwarder] Forwarding platform email ${recipient} to ${PLATFORM_ADMIN_EMAILS.length} admin(s)`,
    );

    // Get original email from S3
    const emailContent = await getEmailFromS3(mail.messageId);

    // Forward to each admin email
    for (const adminEmail of PLATFORM_ADMIN_EMAILS) {
      try {
        await forwardEmail(emailContent, adminEmail, recipient, mail.source);
        console.log(
          `[DBG][email-forwarder] Forwarded platform email to admin: ${adminEmail}`,
        );
      } catch (error) {
        console.error(
          `[DBG][email-forwarder] Failed to forward to admin ${adminEmail}:`,
          error,
        );
      }
    }
    return;
  }

  // Skip system emails (support@, info@, admin@, noreply@, mail@)
  if (PLATFORM_SYSTEM_EMAILS.includes(localPart)) {
    console.log(`[DBG][email-forwarder] Skipping system email: ${recipient}`);
    return;
  }

  const expertId = localPart;

  // Look up expert's forwarding settings
  const expert = await getExpert(expertId);

  if (!expert) {
    console.log(`[DBG][email-forwarder] No expert found for: ${expertId}`);
    return;
  }

  if (!expert.emailForwardingEnabled) {
    console.log(`[DBG][email-forwarder] Forwarding disabled for: ${expertId}`);
    return;
  }

  if (!expert.forwardingEmail) {
    console.log(
      `[DBG][email-forwarder] No forwarding email configured for: ${expertId}`,
    );
    return;
  }

  // Get original email from S3
  const emailContent = await getEmailFromS3(mail.messageId);

  // Forward the email (using platform domain)
  await forwardEmail(
    emailContent,
    expert.forwardingEmail,
    recipient,
    mail.source,
  );

  console.log(
    `[DBG][email-forwarder] Successfully forwarded platform email for ${expertId} to ${expert.forwardingEmail}`,
  );
}

/**
 * Handle BYOD domain email (custom domains)
 */
async function handleByodEmail(
  domain: string,
  recipient: string,
  mail: SESEventRecord["ses"]["mail"],
): Promise<void> {
  // Look up tenant by domain
  const tenant = await getTenantByDomain(domain);

  if (!tenant) {
    console.log(`[DBG][email-forwarder] No tenant found for domain: ${domain}`);
    return;
  }

  // Check if email is configured and verified
  if (!tenant.emailConfig) {
    console.log(
      `[DBG][email-forwarder] Email not configured for tenant: ${tenant.id}`,
    );
    return;
  }

  if (tenant.emailConfig.sesVerificationStatus !== "verified") {
    console.log(
      `[DBG][email-forwarder] Email not verified for tenant: ${tenant.id}`,
    );
    return;
  }

  if (!tenant.emailConfig.forwardingEnabled) {
    console.log(
      `[DBG][email-forwarder] Email forwarding disabled for tenant: ${tenant.id}`,
    );
    return;
  }

  if (!tenant.emailConfig.forwardToEmail) {
    console.log(
      `[DBG][email-forwarder] No forwarding email for tenant: ${tenant.id}`,
    );
    return;
  }

  // Get original email from S3
  const emailContent = await getEmailFromS3(mail.messageId);

  // Forward from the BYOD domain (must be SES verified)
  await forwardEmail(
    emailContent,
    tenant.emailConfig.forwardToEmail,
    recipient,
    mail.source,
    domain, // Use BYOD domain as source
  );

  console.log(
    `[DBG][email-forwarder] Successfully forwarded BYOD email for ${domain} to ${tenant.emailConfig.forwardToEmail}`,
  );
}

async function processRecord(record: SESEventRecord): Promise<void> {
  const mail = record.ses.mail;
  const receipt = record.ses.receipt;

  console.log(`[DBG][email-forwarder] Processing email:`, {
    messageId: mail.messageId,
    source: mail.source,
    recipients: receipt.recipients,
    timestamp: mail.timestamp,
  });

  for (const recipient of receipt.recipients) {
    try {
      // Extract local part and domain from email
      const [localPart, domain] = recipient.toLowerCase().split("@");

      // Handle platform email (myyoga.guru)
      if (domain === PLATFORM_DOMAIN) {
        await handlePlatformEmail(localPart, recipient, mail);
        continue;
      }

      // Handle BYOD custom domain email
      // Any non-myyoga.guru domain is treated as BYOD
      console.log(
        `[DBG][email-forwarder] Processing BYOD domain email: ${recipient}`,
      );
      await handleByodEmail(domain, recipient, mail);
    } catch (error) {
      console.error(
        `[DBG][email-forwarder] Error processing recipient ${recipient}:`,
        error,
      );
    }
  }
}
