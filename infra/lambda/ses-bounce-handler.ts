/**
 * SES Bounce Handler Lambda
 *
 * Triggered by SNS when SES reports a bounce for verification emails.
 * Updates the survey response validation status to 'invalid' with reason 'email_bounced'.
 * Also maintains a blocklist of failed emails for future reference.
 *
 * Flow:
 * 1. SES sends verification email (tagged with ResponseId)
 * 2. Email bounces
 * 3. SES sends bounce notification to SNS
 * 4. SNS triggers this Lambda
 * 5. Lambda parses bounce, finds ResponseId, updates DynamoDB
 * 6. Lambda adds email to blocklist for future checks
 */

import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";
import type { SNSEvent, SNSEventRecord } from "aws-lambda";

// DynamoDB is in ap-southeast-2
const dynamodb = new DynamoDBClient({ region: "ap-southeast-2" });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "yoga-go-core";
const EMAILS_TABLE = process.env.EMAILS_TABLE || "yoga-go-emails";

// SES Bounce notification structure
interface SESBounceNotification {
  notificationType: "Bounce";
  bounce: {
    bounceType: "Permanent" | "Transient" | "Undetermined";
    bounceSubType: string;
    bouncedRecipients: Array<{
      emailAddress: string;
      action?: string;
      status?: string;
      diagnosticCode?: string;
    }>;
    timestamp: string;
    feedbackId: string;
    reportingMTA?: string;
  };
  mail: {
    timestamp: string;
    source: string;
    sourceArn: string;
    sendingAccountId: string;
    messageId: string;
    destination: string[];
    headersTruncated: boolean;
    headers: Array<{ name: string; value: string }>;
    commonHeaders: {
      from: string[];
      to: string[];
      subject: string;
    };
    tags?: Record<string, string[]>;
  };
}

// SES Complaint notification structure (also handle complaints)
interface SESComplaintNotification {
  notificationType: "Complaint";
  complaint: {
    complainedRecipients: Array<{
      emailAddress: string;
    }>;
    timestamp: string;
    feedbackId: string;
    complaintFeedbackType?: string;
  };
  mail: SESBounceNotification["mail"];
}

type SESNotification = SESBounceNotification | SESComplaintNotification;

/**
 * Find survey response by ResponseId using GSI1
 * GSI1PK: RESPONSEID#{responseId}
 */
async function findResponseByResponseId(
  responseId: string,
): Promise<{ pk: string; sk: string } | null> {
  console.log(`[ses-bounce-handler] Looking up response: ${responseId}`);

  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :gsi1pk",
        ExpressionAttributeValues: {
          ":gsi1pk": { S: `RESPONSEID#${responseId}` },
        },
        Limit: 1,
      }),
    );

    if (!result.Items || result.Items.length === 0) {
      console.log(`[ses-bounce-handler] Response not found: ${responseId}`);
      return null;
    }

    const item = result.Items[0];
    return {
      pk: item.PK?.S || "",
      sk: item.SK?.S || "",
    };
  } catch (error) {
    console.error(`[ses-bounce-handler] Error finding response:`, error);
    return null;
  }
}

/**
 * Update survey response validation status to invalid due to bounce
 */
async function markResponseAsInvalid(
  pk: string,
  sk: string,
  reason: "email_bounced" | "complaint",
  bounceDetails: string,
): Promise<void> {
  console.log(`[ses-bounce-handler] Marking response as invalid: ${sk}`);

  try {
    await dynamodb.send(
      new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: pk },
          SK: { S: sk },
        },
        UpdateExpression:
          "SET #validation.#status = :status, #validation.#reason = :reason, #validation.bounceDetails = :bounceDetails, #validation.checkedAt = :checkedAt, updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#validation": "validation",
          "#status": "status",
          "#reason": "reason",
        },
        ExpressionAttributeValues: {
          ":status": { S: "invalid" },
          ":reason": { S: reason },
          ":bounceDetails": { S: bounceDetails },
          ":checkedAt": { S: new Date().toISOString() },
          ":updatedAt": { S: new Date().toISOString() },
        },
      }),
    );

    console.log(`[ses-bounce-handler] Response marked as invalid`);
  } catch (error) {
    console.error(
      `[ses-bounce-handler] Error updating response status:`,
      error,
    );
    throw error;
  }
}

/**
 * Add an email to the blocklist
 * Stored in yoga-go-emails table as: PK=EMAIL_BLOCKLIST, SK={normalized_email}
 */
async function addToBlocklist(
  email: string,
  reason: "bounce" | "complaint",
  details: {
    bounceType?: string;
    bounceSubType?: string;
    complaintFeedbackType?: string;
    diagnosticCode?: string;
  },
): Promise<void> {
  const normalizedEmail = email.toLowerCase().trim();

  console.log(
    `[ses-bounce-handler] Adding to blocklist: ${normalizedEmail} (${reason})`,
  );

  try {
    await dynamodb.send(
      new PutItemCommand({
        TableName: EMAILS_TABLE,
        Item: {
          PK: { S: "EMAIL_BLOCKLIST" },
          SK: { S: normalizedEmail },
          email: { S: normalizedEmail },
          reason: { S: reason },
          ...(details.bounceType && { bounceType: { S: details.bounceType } }),
          ...(details.bounceSubType && {
            bounceSubType: { S: details.bounceSubType },
          }),
          ...(details.complaintFeedbackType && {
            complaintFeedbackType: { S: details.complaintFeedbackType },
          }),
          ...(details.diagnosticCode && {
            diagnosticCode: { S: details.diagnosticCode },
          }),
          blockedAt: { S: new Date().toISOString() },
          createdAt: { S: new Date().toISOString() },
        },
        // Don't overwrite if already exists - keep original block reason
        ConditionExpression:
          "attribute_not_exists(PK) AND attribute_not_exists(SK)",
      }),
    );

    console.log(`[ses-bounce-handler] Email added to blocklist`);
  } catch (error) {
    // ConditionalCheckFailedException means email already in blocklist - that's fine
    if ((error as { name?: string }).name === "ConditionalCheckFailedException") {
      console.log(
        `[ses-bounce-handler] Email already in blocklist: ${normalizedEmail}`,
      );
      return;
    }
    console.error(`[ses-bounce-handler] Error adding to blocklist:`, error);
    // Don't throw - blocklist is supplementary, not critical
  }
}

/**
 * Process a bounce notification
 */
async function processBounce(
  notification: SESBounceNotification,
): Promise<void> {
  const { bounce, mail } = notification;

  console.log(`[ses-bounce-handler] Processing bounce:`, {
    bounceType: bounce.bounceType,
    bounceSubType: bounce.bounceSubType,
    recipients: bounce.bouncedRecipients.map((r) => r.emailAddress),
    messageId: mail.messageId,
  });

  // Extract ResponseId from email tags
  const responseId = mail.tags?.ResponseId?.[0];

  if (!responseId) {
    console.log(
      `[ses-bounce-handler] No ResponseId tag found - skipping (not a survey verification email)`,
    );
    return;
  }

  // Only process permanent bounces (hard bounces)
  // Transient bounces might be temporary issues
  if (bounce.bounceType !== "Permanent") {
    console.log(
      `[ses-bounce-handler] Ignoring transient bounce for: ${responseId}`,
    );
    return;
  }

  // Add all bounced recipients to the blocklist
  for (const recipient of bounce.bouncedRecipients) {
    await addToBlocklist(recipient.emailAddress, "bounce", {
      bounceType: bounce.bounceType,
      bounceSubType: bounce.bounceSubType,
      diagnosticCode: recipient.diagnosticCode,
    });
  }

  // Find the survey response
  const response = await findResponseByResponseId(responseId);
  if (!response) {
    console.log(
      `[ses-bounce-handler] Could not find survey response: ${responseId}`,
    );
    return;
  }

  // Build bounce details for logging
  const bounceDetails = JSON.stringify({
    type: bounce.bounceType,
    subType: bounce.bounceSubType,
    recipients: bounce.bouncedRecipients,
    timestamp: bounce.timestamp,
  });

  // Mark the response as invalid
  await markResponseAsInvalid(
    response.pk,
    response.sk,
    "email_bounced",
    bounceDetails,
  );
}

/**
 * Process a complaint notification
 */
async function processComplaint(
  notification: SESComplaintNotification,
): Promise<void> {
  const { complaint, mail } = notification;

  console.log(`[ses-bounce-handler] Processing complaint:`, {
    recipients: complaint.complainedRecipients.map((r) => r.emailAddress),
    feedbackType: complaint.complaintFeedbackType,
    messageId: mail.messageId,
  });

  // Add all complained recipients to the blocklist
  // (do this for ALL complaints, not just survey verification emails)
  for (const recipient of complaint.complainedRecipients) {
    await addToBlocklist(recipient.emailAddress, "complaint", {
      complaintFeedbackType: complaint.complaintFeedbackType,
    });
  }

  // Extract ResponseId from email tags
  const responseId = mail.tags?.ResponseId?.[0];

  if (!responseId) {
    console.log(
      `[ses-bounce-handler] No ResponseId tag found - skipping survey update (not a survey verification email)`,
    );
    return;
  }

  // Find the survey response
  const response = await findResponseByResponseId(responseId);
  if (!response) {
    console.log(
      `[ses-bounce-handler] Could not find survey response: ${responseId}`,
    );
    return;
  }

  // Mark the response as invalid due to complaint
  await markResponseAsInvalid(
    response.pk,
    response.sk,
    "complaint",
    JSON.stringify({
      feedbackType: complaint.complaintFeedbackType,
      timestamp: complaint.timestamp,
    }),
  );
}

/**
 * Process a single SNS record
 */
async function processRecord(record: SNSEventRecord): Promise<void> {
  try {
    const message = JSON.parse(record.Sns.Message) as SESNotification;

    console.log(
      `[ses-bounce-handler] Received notification type: ${message.notificationType}`,
    );

    if (message.notificationType === "Bounce") {
      await processBounce(message as SESBounceNotification);
    } else if (message.notificationType === "Complaint") {
      await processComplaint(message as SESComplaintNotification);
    } else {
      console.log(
        `[ses-bounce-handler] Ignoring notification type: ${message.notificationType}`,
      );
    }
  } catch (error) {
    console.error(`[ses-bounce-handler] Error processing record:`, error);
    // Don't throw - continue processing other records
  }
}

/**
 * Lambda handler for SNS events from SES
 */
export async function handler(event: SNSEvent): Promise<void> {
  console.log(
    `[ses-bounce-handler] Processing ${event.Records.length} record(s)`,
  );

  for (const record of event.Records) {
    await processRecord(record);
  }

  console.log(`[ses-bounce-handler] Finished processing`);
}
