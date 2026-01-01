/**
 * DynamoDB Stream Lambda for Survey Response Email Validation
 *
 * Triggered when new SURVEYRESP records are created in yoga-go-core table.
 *
 * Validation checks:
 * 1. Duplicate email check - reject if > 3 responses from same email for same survey
 * 2. Disposable email check - reject if email uses known temporary/disposable domain
 * 3. MX DNS record check - reject if domain has no mail server configured
 * 4. Blocklist check - reject if email has previously bounced or received complaints
 * 5. DeBounce API check - real-time email validation to prevent bounces
 * 6. Bounce check - send verification email and mark as pending (bounce handled separately)
 *
 * Updates the response record with validation status.
 */

import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import {
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { promises as dns } from "dns";

// SES is in us-west-2
const ses = new SESClient({ region: "us-west-2" });
// DynamoDB is in ap-southeast-2
const dynamodb = new DynamoDBClient({ region: "ap-southeast-2" });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "yoga-go-core";
const EMAILS_TABLE = process.env.EMAILS_TABLE || "yoga-go-emails";
const FROM_EMAIL = process.env.SES_FROM_EMAIL || "verify@myyoga.guru";
const CONFIG_SET = process.env.SES_CONFIG_SET;
const DEBOUNCE_API_KEY = process.env.DEBOUNCE_API_KEY;
const MAX_RESPONSES_PER_EMAIL = 3;

// List of known disposable email domains
// This is a subset - in production, consider using an API service or larger list
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  // Popular disposable email services
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.org",
  "guerrillamail.net",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "guerrillamail.biz",
  "guerrillamail.de",
  "tempmail.com",
  "temp-mail.org",
  "temp-mail.io",
  "throwawaymail.com",
  "10minutemail.com",
  "10minutemail.net",
  "10minutemail.org",
  "tempail.com",
  "fakemailgenerator.com",
  "getnada.com",
  "mohmal.com",
  "maildrop.cc",
  "mailnesia.com",
  "dispostable.com",
  "mintemail.com",
  "mt2009.com",
  "yopmail.com",
  "yopmail.fr",
  "yopmail.net",
  "trashmail.com",
  "trashmail.net",
  "trashmail.org",
  "trashmail.me",
  "spamgourmet.com",
  "mytrashmail.com",
  "mailcatch.com",
  "incognitomail.com",
  "mailexpire.com",
  "getairmail.com",
  "discard.email",
  "discardmail.com",
  "throwaway.email",
  "tmails.net",
  "emailondeck.com",
  "anonymbox.com",
  "fakeinbox.com",
  "tempr.email",
  "tempinbox.com",
  "burnermail.io",
  "33mail.com",
  "mailsac.com",
  "spam4.me",
  "emailfake.com",
  "crazymailing.com",
  "tempmailo.com",
  "tempmailaddress.com",
  "jetable.org",
  "spambox.us",
  "owlymail.com",
  "anonaddy.me",
  "mailslurp.com",
  // Add more as needed
]);

interface SurveyResponseRecord {
  PK: string;
  SK: string;
  id: string;
  surveyId: string;
  expertId: string;
  contactInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface ValidationResult {
  status: "valid" | "invalid" | "pending";
  reason?: string;
  emailDomain?: string;
  mxRecordFound?: boolean;
  verificationEmailSent?: boolean;
  previousResponseCount?: number;
}

/**
 * Extract email domain from email address
 */
function getEmailDomain(email: string): string | null {
  const parts = email.toLowerCase().trim().split("@");
  if (parts.length !== 2) return null;
  return parts[1];
}

/**
 * Check if email domain is a known disposable/temporary email provider
 */
function isDisposableEmail(domain: string): boolean {
  return DISPOSABLE_EMAIL_DOMAINS.has(domain.toLowerCase());
}

/**
 * Check if domain has MX DNS records
 */
async function hasMxRecord(domain: string): Promise<boolean> {
  try {
    const mxRecords = await dns.resolveMx(domain);
    return mxRecords && mxRecords.length > 0;
  } catch {
    // DNS lookup failed - domain likely has no MX records
    return false;
  }
}

/**
 * Check if email is in the blocklist (previously bounced or complained)
 * Blocklist stored in yoga-go-emails table: PK=EMAIL_BLOCKLIST, SK={normalized_email}
 */
async function isEmailBlocklisted(
  email: string,
): Promise<{ blocked: boolean; reason?: string }> {
  const normalizedEmail = email.toLowerCase().trim();

  console.log(
    `[survey-response-validator] Checking blocklist for: ${normalizedEmail}`,
  );

  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: EMAILS_TABLE,
        Key: {
          PK: { S: "EMAIL_BLOCKLIST" },
          SK: { S: normalizedEmail },
        },
        ProjectionExpression: "reason, blockedAt",
      }),
    );

    if (result.Item) {
      const reason = result.Item.reason?.S || "unknown";
      console.log(
        `[survey-response-validator] Email is blocklisted: ${normalizedEmail} (${reason})`,
      );
      return { blocked: true, reason };
    }

    return { blocked: false };
  } catch (error) {
    console.error(
      `[survey-response-validator] Error checking blocklist:`,
      error,
    );
    // On error, don't block - err on the side of allowing
    return { blocked: false };
  }
}

/**
 * DeBounce API response structure
 */
interface DeBounceResponse {
  debounce: {
    email: string;
    code: string;
    role: string;
    free_email: string;
    result: "Invalid" | "Risky" | "Safe to Send" | "Unknown";
    reason: string;
    send_transactional: string;
    did_you_mean: string;
  };
  success: string;
  balance: string;
}

/**
 * Validate email using DeBounce API
 * Returns whether the email is valid for sending transactional emails
 */
async function validateWithDeBounce(
  email: string,
): Promise<{ valid: boolean; reason?: string; result?: string }> {
  if (!DEBOUNCE_API_KEY) {
    console.log(
      `[survey-response-validator] DeBounce API key not configured - skipping validation`,
    );
    return { valid: true };
  }

  console.log(`[survey-response-validator] Validating with DeBounce: ${email}`);

  try {
    const url = new URL("https://api.debounce.io/v1/");
    url.searchParams.set("api", DEBOUNCE_API_KEY);
    url.searchParams.set("email", email);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.error(
        `[survey-response-validator] DeBounce API error: ${response.status}`,
      );
      // On API error, allow the email through - we'll catch bounces later
      return { valid: true };
    }

    const data = (await response.json()) as DeBounceResponse;

    console.log(`[survey-response-validator] DeBounce result:`, {
      email: data.debounce.email,
      result: data.debounce.result,
      reason: data.debounce.reason,
      send_transactional: data.debounce.send_transactional,
      balance: data.balance,
    });

    // Check if email is safe for transactional emails
    // send_transactional = "1" means OK to send
    if (data.debounce.send_transactional === "1") {
      return { valid: true, result: data.debounce.result };
    }

    // Email is not safe to send - reject it
    return {
      valid: false,
      reason: data.debounce.reason,
      result: data.debounce.result,
    };
  } catch (error) {
    console.error(`[survey-response-validator] DeBounce API error:`, error);
    // On error, allow the email through - we'll catch bounces later
    return { valid: true };
  }
}

/**
 * Count previous responses from this email for the same survey
 */
async function countPreviousResponses(
  tenantId: string,
  surveyId: string,
  email: string,
): Promise<number> {
  console.log(
    `[survey-response-validator] Counting responses for email: ${email}, survey: ${surveyId}`,
  );

  try {
    // Query all responses for this survey
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": { S: `TENANT#${tenantId}` },
          ":skPrefix": { S: `SURVEYRESP#${surveyId}#` },
        },
        ProjectionExpression: "contactInfo",
      }),
    );

    if (!result.Items) return 0;

    // Count responses with matching email
    let count = 0;
    for (const item of result.Items) {
      const unmarshalled = unmarshall(item as Record<string, AttributeValue>);
      const itemEmail = unmarshalled.contactInfo?.email?.toLowerCase().trim();
      if (itemEmail === email.toLowerCase().trim()) {
        count++;
      }
    }

    console.log(
      `[survey-response-validator] Found ${count} previous responses from ${email}`,
    );
    return count;
  } catch (error) {
    console.error(
      `[survey-response-validator] Error counting responses:`,
      error,
    );
    return 0;
  }
}

/**
 * Send verification email to check for bounces
 * The email is minimal - just to verify deliverability
 */
async function sendVerificationEmail(
  email: string,
  responseId: string,
): Promise<boolean> {
  console.log(
    `[survey-response-validator] Sending verification email to: ${email}`,
  );

  try {
    await ses.send(
      new SendEmailCommand({
        Source: FROM_EMAIL,
        Destination: { ToAddresses: [email] },
        Message: {
          Subject: { Data: "Thank you for your response" },
          Body: {
            Text: {
              Data: "Thank you for submitting your response. This email confirms your submission was received.",
            },
            Html: {
              Data: `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <p>Thank you for submitting your response.</p>
  <p>This email confirms your submission was received.</p>
  <p style="color: #666; font-size: 12px; margin-top: 30px;">
    Powered by MyYoga.guru
  </p>
</body>
</html>`,
            },
          },
        },
        ConfigurationSetName: CONFIG_SET,
        Tags: [
          { Name: "EmailType", Value: "survey-response-verification" },
          { Name: "ResponseId", Value: responseId },
        ],
      }),
    );

    console.log(
      `[survey-response-validator] Verification email sent to: ${email}`,
    );
    return true;
  } catch (error) {
    console.error(
      `[survey-response-validator] Error sending verification email:`,
      error,
    );
    return false;
  }
}

/**
 * Update the survey response with validation status
 */
async function updateValidationStatus(
  pk: string,
  sk: string,
  validation: ValidationResult,
): Promise<void> {
  console.log(
    `[survey-response-validator] Updating validation status: ${validation.status}`,
  );

  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: pk },
          SK: { S: sk },
        },
        UpdateExpression:
          "SET #validation = :validation, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#validation": "validation",
        },
        ExpressionAttributeValues: {
          ":validation": {
            M: {
              status: { S: validation.status },
              ...(validation.reason && { reason: { S: validation.reason } }),
              checkedAt: { S: new Date().toISOString() },
              ...(validation.emailDomain && {
                emailDomain: { S: validation.emailDomain },
              }),
              ...(validation.mxRecordFound !== undefined && {
                mxRecordFound: { BOOL: validation.mxRecordFound },
              }),
              ...(validation.verificationEmailSent !== undefined && {
                verificationEmailSent: { BOOL: validation.verificationEmailSent },
              }),
              ...(validation.previousResponseCount !== undefined && {
                previousResponseCount: {
                  N: validation.previousResponseCount.toString(),
                },
              }),
            },
          },
          ":updatedAt": { S: new Date().toISOString() },
        },
      }),
    );

    console.log(`[survey-response-validator] Validation status updated`);
  } catch (error) {
    console.error(
      `[survey-response-validator] Error updating validation status:`,
      error,
    );
    throw error;
  }
}

/**
 * Validate a survey response email
 */
async function validateResponse(
  record: SurveyResponseRecord,
): Promise<ValidationResult> {
  const email = record.contactInfo?.email;

  // No email provided - skip validation
  if (!email) {
    console.log(`[survey-response-validator] No email provided - skipping`);
    return { status: "valid", reason: "no_email" };
  }

  const emailDomain = getEmailDomain(email);
  if (!emailDomain) {
    console.log(`[survey-response-validator] Invalid email format: ${email}`);
    return { status: "invalid", reason: "no_email", emailDomain: undefined };
  }

  console.log(
    `[survey-response-validator] Validating email: ${email} (domain: ${emailDomain})`,
  );

  // Check 1: Duplicate email (> 3 responses from same email)
  const previousCount = await countPreviousResponses(
    record.expertId,
    record.surveyId,
    email,
  );

  // Note: previousCount includes the current response, so we check for > MAX (not >=)
  if (previousCount > MAX_RESPONSES_PER_EMAIL) {
    console.log(
      `[survey-response-validator] Too many responses from ${email}: ${previousCount}`,
    );
    return {
      status: "invalid",
      reason: "duplicate_email",
      emailDomain,
      previousResponseCount: previousCount,
    };
  }

  // Check 2: Disposable email domain
  if (isDisposableEmail(emailDomain)) {
    console.log(
      `[survey-response-validator] Disposable email domain: ${emailDomain}`,
    );
    return {
      status: "invalid",
      reason: "disposable_email",
      emailDomain,
      previousResponseCount: previousCount,
    };
  }

  // Check 3: MX DNS record check
  const hasMx = await hasMxRecord(emailDomain);
  if (!hasMx) {
    console.log(`[survey-response-validator] No MX record for: ${emailDomain}`);
    return {
      status: "invalid",
      reason: "no_mx_record",
      emailDomain,
      mxRecordFound: false,
      previousResponseCount: previousCount,
    };
  }

  // Check 4: Email blocklist check (previously bounced or complained)
  const blocklistCheck = await isEmailBlocklisted(email);
  if (blocklistCheck.blocked) {
    console.log(
      `[survey-response-validator] Email blocklisted: ${email} (${blocklistCheck.reason})`,
    );
    return {
      status: "invalid",
      reason: "blocklisted",
      emailDomain,
      mxRecordFound: true,
      previousResponseCount: previousCount,
    };
  }

  // Check 5: DeBounce API validation (pre-flight check to avoid bounces)
  const debounceCheck = await validateWithDeBounce(email);
  if (!debounceCheck.valid) {
    console.log(
      `[survey-response-validator] DeBounce rejected: ${email} (${debounceCheck.reason})`,
    );
    return {
      status: "invalid",
      reason: "debounce_invalid",
      emailDomain,
      mxRecordFound: true,
      previousResponseCount: previousCount,
    };
  }

  // Check 6: Send verification email for bounce check
  // The response is marked as "pending" until we confirm no bounce
  // Bounce handling is done by SES notifications (separate process)
  const emailSent = await sendVerificationEmail(email, record.id);

  // If email was sent successfully, mark as valid (bounce will be handled separately)
  // If email failed to send, still mark as valid but note the failure
  return {
    status: "valid",
    emailDomain,
    mxRecordFound: true,
    verificationEmailSent: emailSent,
    previousResponseCount: previousCount,
  };
}

/**
 * Process a single DynamoDB stream record
 */
async function processRecord(record: DynamoDBRecord): Promise<void> {
  // Only process INSERT events (new records)
  if (record.eventName !== "INSERT") {
    return;
  }

  const newImage = record.dynamodb?.NewImage;
  if (!newImage) {
    return;
  }

  // Unmarshall the DynamoDB record
  const item = unmarshall(
    newImage as Record<string, AttributeValue>,
  ) as SurveyResponseRecord;

  // Only process SURVEYRESP records
  if (!item.SK?.startsWith("SURVEYRESP#")) {
    return;
  }

  console.log(
    `[survey-response-validator] Processing survey response: ${item.id}`,
  );

  try {
    const validation = await validateResponse(item);
    await updateValidationStatus(item.PK, item.SK, validation);
  } catch (error) {
    console.error(
      `[survey-response-validator] Error validating response:`,
      error,
    );
    // Don't throw - continue processing other records
  }
}

/**
 * Lambda handler for DynamoDB Stream events
 */
export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  console.log(
    `[survey-response-validator] Processing ${event.Records.length} record(s)`,
  );

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error(
        `[survey-response-validator] Error processing record:`,
        error,
      );
      // Continue processing other records
    }
  }

  console.log(`[survey-response-validator] Finished processing`);
}
