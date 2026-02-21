/**
 * DynamoDB Stream Lambda for Cally Real-Time Notifications
 *
 * Triggered by:
 * - yoga-go-emails table (INSERT events for incoming emails)
 *
 * This Lambda:
 * 1. Receives INSERT events from DynamoDB streams
 * 2. Checks if the email belongs to a Cally tenant (by looking up expertId in cally-main)
 * 3. Creates notification records in cally-main table
 * 4. Pushes to Firebase RTDB for real-time web delivery
 * 5. Sends Expo push notifications for mobile delivery
 *
 * Note: This is stream consumer 2 of 2 on yoga-go-emails.
 * Consumer 1 is yoga-go-notification-stream.
 */

import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import * as admin from "firebase-admin";

const dynamodb = new DynamoDBClient({ region: "ap-southeast-2" });
const secretsManager = new SecretsManagerClient({ region: "ap-southeast-2" });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "cally-main";
const SECRETS_NAME = process.env.SECRETS_NAME || "yoga-go/production";

// Firebase Admin initialization (lazy loaded)
let firebaseInitialized = false;
let firebaseDb: admin.database.Database | null = null;

interface EmailRecord {
  id: string;
  expertId: string;
  messageId: string;
  from: {
    name?: string;
    email: string;
  };
  subject: string;
  receivedAt: string;
  isOutgoing?: boolean;
}

interface NotificationInput {
  recipientId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationRecord {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Check if an expertId corresponds to a Cally tenant
 * by looking for PK=TENANT#{expertId}, SK=META in cally-main
 */
async function isCallyTenant(expertId: string): Promise<boolean> {
  try {
    const result = await dynamodb.send(
      new GetItemCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: { S: `TENANT#${expertId}` },
          SK: { S: "META" },
        },
        ProjectionExpression: "PK",
      }),
    );
    return !!result.Item;
  } catch (error) {
    console.error(
      "[cally-notification-stream] Error checking tenant:",
      error,
    );
    return false;
  }
}

/**
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase(): Promise<void> {
  if (firebaseInitialized) return;

  try {
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({ SecretId: SECRETS_NAME }),
    );

    if (!secretResponse.SecretString) {
      console.log(
        "[cally-notification-stream] No secret found, Firebase disabled",
      );
      return;
    }

    const secrets = JSON.parse(secretResponse.SecretString);
    const serviceAccountJson = secrets.FIREBASE_SERVICE_ACCOUNT;
    const databaseUrl = secrets.FIREBASE_DATABASE_URL;

    if (!serviceAccountJson || !databaseUrl) {
      console.log(
        "[cally-notification-stream] Firebase credentials not found in secrets",
      );
      return;
    }

    const serviceAccount =
      typeof serviceAccountJson === "string"
        ? JSON.parse(serviceAccountJson)
        : serviceAccountJson;

    // Use a named app to avoid collision with yoga's notification-stream
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: databaseUrl,
      });
    }

    firebaseDb = admin.database();
    firebaseInitialized = true;
    console.log(
      "[cally-notification-stream] Firebase initialized successfully",
    );
  } catch (error) {
    console.error(
      "[cally-notification-stream] Failed to initialize Firebase:",
      error,
    );
  }
}

/**
 * Push notification to Firebase RTDB under cally-notifications path
 */
async function pushToFirebase(
  notification: NotificationRecord,
): Promise<void> {
  if (!firebaseDb) {
    console.log(
      "[cally-notification-stream] Firebase not available, skipping push",
    );
    return;
  }

  try {
    const ref = firebaseDb.ref(
      `cally-notifications/${notification.recipientId}/${notification.id}`,
    );
    await ref.set(notification);
    console.log(
      `[cally-notification-stream] Pushed to Firebase: ${notification.id}`,
    );
  } catch (error) {
    console.error(
      "[cally-notification-stream] Failed to push to Firebase:",
      error,
    );
  }
}

/**
 * Get push tokens for a tenant from cally-main
 */
async function getPushTokens(
  tenantId: string,
): Promise<{ token: string; platform: string }[]> {
  try {
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
        ExpressionAttributeValues: {
          ":pk": { S: `TENANT#${tenantId}` },
          ":skPrefix": { S: "PUSH_TOKEN#" },
        },
      }),
    );

    return (result.Items || []).map((item) => ({
      token: item.token?.S || "",
      platform: item.platform?.S || "ios",
    }));
  } catch (error) {
    console.error(
      "[cally-notification-stream] Error fetching push tokens:",
      error,
    );
    return [];
  }
}

/**
 * Send Expo push notifications
 */
async function sendExpoPushNotifications(
  tokens: { token: string; platform: string }[],
  notification: NotificationRecord,
): Promise<void> {
  if (tokens.length === 0) return;

  const messages = tokens
    .filter((t) => t.token.startsWith("ExponentPushToken["))
    .map((t) => ({
      to: t.token,
      sound: "default" as const,
      title: notification.title,
      body: notification.message,
      data: {
        notificationId: notification.id,
        type: notification.type,
        link: notification.link,
      },
    }));

  if (messages.length === 0) return;

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });

    if (!response.ok) {
      console.error(
        "[cally-notification-stream] Expo push failed:",
        response.status,
        await response.text(),
      );
    } else {
      console.log(
        `[cally-notification-stream] Sent ${messages.length} push notifications`,
      );
    }
  } catch (error) {
    console.error(
      "[cally-notification-stream] Error sending push notifications:",
      error,
    );
  }
}

/**
 * Create a notification record in DynamoDB and push to Firebase + Expo
 */
async function createNotification(
  input: NotificationInput,
): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  const id = uuidv4();

  const notification: NotificationRecord = {
    id,
    recipientId: input.recipientId,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link,
    isRead: false,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  // Write to DynamoDB
  const item: Record<string, AttributeValue> = {
    PK: { S: `TENANT#${input.recipientId}` },
    SK: { S: `NOTIF#${now}#${id}` },
    EntityType: { S: "NOTIFICATION" },
    id: { S: id },
    recipientId: { S: input.recipientId },
    type: { S: input.type },
    title: { S: input.title },
    message: { S: input.message },
    isRead: { BOOL: false },
    createdAt: { S: now },
    updatedAt: { S: now },
  };

  if (input.link) {
    item.link = { S: input.link };
  }
  if (input.metadata) {
    item.metadata = { S: JSON.stringify(input.metadata) };
  }

  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: item,
    }),
  );

  console.log(
    `[cally-notification-stream] Created notification ${id} for ${input.recipientId}`,
  );

  // Push to Firebase for real-time web delivery
  await pushToFirebase(notification);

  // Send Expo push notifications for mobile
  const pushTokens = await getPushTokens(input.recipientId);
  await sendExpoPushNotifications(pushTokens, notification);

  return notification;
}

/**
 * Handle new email event - create notification for Cally tenant
 */
async function handleNewEmail(email: EmailRecord): Promise<void> {
  console.log(
    `[cally-notification-stream] Processing new email for: ${email.expertId}`,
  );

  // Skip outgoing emails
  if (email.isOutgoing) {
    console.log("[cally-notification-stream] Skipping outgoing email");
    return;
  }

  // Check if this expertId is a Cally tenant
  const isCally = await isCallyTenant(email.expertId);
  if (!isCally) {
    console.log(
      "[cally-notification-stream] Not a Cally tenant, skipping:",
      email.expertId,
    );
    return;
  }

  const senderName = email.from.name || email.from.email;

  await createNotification({
    recipientId: email.expertId,
    type: "email_received",
    title: `New email from ${senderName}`,
    message: email.subject || "(No subject)",
    link: `/srv/${email.expertId}/inbox/${email.id}`,
    metadata: {
      emailId: email.id,
      fromEmail: email.from.email,
      fromName: email.from.name,
      subject: email.subject,
      receivedAt: email.receivedAt,
    },
  });
}

/**
 * Process a single DynamoDB stream record
 */
async function processRecord(record: DynamoDBRecord): Promise<void> {
  if (!record.dynamodb?.NewImage) {
    console.log(
      "[cally-notification-stream] No NewImage in record, skipping",
    );
    return;
  }

  const eventName = record.eventName;
  const eventSourceARN = record.eventSourceARN || "";

  console.log(
    `[cally-notification-stream] Processing ${eventName} from ${eventSourceARN}`,
  );

  if (eventName !== "INSERT") {
    console.log("[cally-notification-stream] Not an INSERT event, skipping");
    return;
  }

  const newImage = unmarshall(
    record.dynamodb.NewImage as Record<string, AttributeValue>,
  );

  if (eventSourceARN.includes("yoga-go-emails")) {
    const email = newImage as EmailRecord;

    if (!email.expertId || !email.from) {
      console.log(
        "[cally-notification-stream] Missing required email fields, skipping",
      );
      return;
    }

    await handleNewEmail(email);
  }
}

/**
 * Lambda handler
 */
export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  console.log(
    `[cally-notification-stream] Processing ${event.Records.length} records`,
  );

  // Initialize Firebase (lazy load)
  await initializeFirebase();

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error(
        "[cally-notification-stream] Error processing record:",
        error,
      );
      // Don't throw - continue processing other records
    }
  }

  console.log("[cally-notification-stream] Processing complete");
}
