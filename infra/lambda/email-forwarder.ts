import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import type { SESEvent, SESEventRecord } from 'aws-lambda';

const s3 = new S3Client({});
const ses = new SESClient({});
// DynamoDB is in ap-southeast-2
const dynamodb = new DynamoDBClient({ region: 'ap-southeast-2' });

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'yoga-go-core';
const BUCKET_NAME = process.env.EMAIL_BUCKET || '';
const DEFAULT_FROM = process.env.DEFAULT_FROM_EMAIL || 'hi@myyoga.guru';

interface ExpertData {
  forwardingEmail?: string;
  emailForwardingEnabled?: boolean;
}

/**
 * Get expert data from DynamoDB
 */
async function getExpert(expertId: string): Promise<ExpertData | null> {
  console.log(`[DBG][email-forwarder] Looking up expert: ${expertId}`);

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: {
        ':pk': { S: `EXPERT#${expertId}` },
        ':sk': { S: `PROFILE#${expertId}` },
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log(`[DBG][email-forwarder] Expert not found: ${expertId}`);
    return null;
  }

  const item = result.Items[0];
  const platformPreferences = item.platformPreferences?.M;

  return {
    forwardingEmail: platformPreferences?.forwardingEmail?.S,
    emailForwardingEnabled: platformPreferences?.emailForwardingEnabled?.BOOL,
  };
}

/**
 * Get raw email content from S3
 */
async function getEmailFromS3(messageId: string): Promise<string> {
  console.log(`[DBG][email-forwarder] Fetching email from S3: incoming/${messageId}`);

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: `incoming/${messageId}`,
    })
  );

  const body = await response.Body?.transformToString();
  if (!body) {
    throw new Error('Empty email body');
  }

  return body;
}

/**
 * Forward email to the expert's personal email
 */
async function forwardEmail(
  rawEmail: string,
  forwardTo: string,
  originalRecipient: string,
  originalSender: string
): Promise<void> {
  console.log(`[DBG][email-forwarder] Forwarding email to: ${forwardTo}`);

  // Parse and modify email headers for forwarding
  // We need to:
  // 1. Change the To: header to the forwarding address
  // 2. Add X-Original-To: header with original recipient
  // 3. Set the From: to our verified domain (required by SES)
  // 4. Add Reply-To: with original sender
  const lines = rawEmail.split('\r\n');
  const modifiedLines: string[] = [];
  let inHeaders = true;
  let addedHeaders = false;

  for (const line of lines) {
    if (inHeaders) {
      if (line === '') {
        // End of headers - add our custom headers before the empty line
        if (!addedHeaders) {
          modifiedLines.push(`X-Original-To: ${originalRecipient}`);
          modifiedLines.push(`X-Forwarded-For: ${originalRecipient}`);
          addedHeaders = true;
        }
        inHeaders = false;
        modifiedLines.push(line);
      } else if (line.toLowerCase().startsWith('to:')) {
        // Replace To: header
        modifiedLines.push(`To: ${forwardTo}`);
      } else if (line.toLowerCase().startsWith('from:')) {
        // Keep original From but add Reply-To
        modifiedLines.push(line);
        modifiedLines.push(`Reply-To: ${originalSender}`);
      } else if (line.toLowerCase().startsWith('return-path:')) {
        // Update Return-Path to our domain
        modifiedLines.push(`Return-Path: <${DEFAULT_FROM}>`);
      } else if (
        line.toLowerCase().startsWith('dkim-signature:') ||
        line.toLowerCase().startsWith('domainkey-signature:')
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

  const modifiedEmail = modifiedLines.join('\r\n');

  await ses.send(
    new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(modifiedEmail) },
      Source: DEFAULT_FROM,
      Destinations: [forwardTo],
    })
  );

  console.log(`[DBG][email-forwarder] Email forwarded successfully to ${forwardTo}`);
}

/**
 * Lambda handler for SES incoming email events
 */
export async function handler(event: SESEvent): Promise<void> {
  console.log(`[DBG][email-forwarder] Processing ${event.Records.length} email(s)`);

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error('[DBG][email-forwarder] Error processing record:', error);
      // Continue processing other records even if one fails
    }
  }
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
      // Extract expert ID from email (e.g., "arun" from "arun@myyoga.guru")
      const [localPart, domain] = recipient.toLowerCase().split('@');

      if (domain !== 'myyoga.guru') {
        console.log(`[DBG][email-forwarder] Skipping non-myyoga.guru recipient: ${recipient}`);
        continue;
      }

      // Skip platform emails (hi@, support@, etc.)
      const platformEmails = ['hi', 'support', 'info', 'contact', 'admin', 'noreply', 'mail'];
      if (platformEmails.includes(localPart)) {
        console.log(`[DBG][email-forwarder] Skipping platform email: ${recipient}`);
        continue;
      }

      const expertId = localPart;

      // Look up expert's forwarding settings
      const expert = await getExpert(expertId);

      if (!expert) {
        console.log(`[DBG][email-forwarder] No expert found for: ${expertId}`);
        continue;
      }

      if (!expert.emailForwardingEnabled) {
        console.log(`[DBG][email-forwarder] Forwarding disabled for: ${expertId}`);
        continue;
      }

      if (!expert.forwardingEmail) {
        console.log(`[DBG][email-forwarder] No forwarding email configured for: ${expertId}`);
        continue;
      }

      // Get original email from S3
      const emailContent = await getEmailFromS3(mail.messageId);

      // Forward the email
      await forwardEmail(emailContent, expert.forwardingEmail, recipient, mail.source);

      console.log(
        `[DBG][email-forwarder] Successfully forwarded email for ${expertId} to ${expert.forwardingEmail}`
      );
    } catch (error) {
      console.error(`[DBG][email-forwarder] Error processing recipient ${recipient}:`, error);
    }
  }
}
