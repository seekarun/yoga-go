/**
 * DynamoDB Stream Lambda for Real-Time Notifications
 *
 * Triggered by: yoga-go-emails table (INSERT events for incoming emails)
 *
 * This Lambda:
 * 1. Receives new email events from DynamoDB stream
 * 2. Creates notification records in yoga-go-core table
 * 3. Pushes to Firebase RTDB for real-time delivery
 *
 * Extends to other events:
 * - Forum comments/replies
 * - Payment received
 * - New signups
 * - Course enrollments
 */

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import type { DynamoDBStreamEvent, DynamoDBRecord } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import type { AttributeValue } from "@aws-sdk/client-dynamodb";
import { v4 as uuidv4 } from "uuid";
import * as admin from "firebase-admin";

// DynamoDB is in ap-southeast-2
const dynamodb = new DynamoDBClient({ region: "ap-southeast-2" });
const secretsManager = new SecretsManagerClient({ region: "ap-southeast-2" });

const TABLE_NAME = process.env.DYNAMODB_TABLE || "yoga-go-core";

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
  recipientType: "user" | "expert";
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationRecord {
  id: string;
  recipientId: string;
  recipientType: "user" | "expert";
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
 * Initialize Firebase Admin SDK
 */
async function initializeFirebase(): Promise<void> {
  if (firebaseInitialized) return;

  try {
    // Get Firebase service account from Secrets Manager
    const secretResponse = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: "yoga-go/production",
      })
    );

    if (!secretResponse.SecretString) {
      console.log("[notification-stream] No secret found, Firebase disabled");
      return;
    }

    const secrets = JSON.parse(secretResponse.SecretString);
    const serviceAccountJson = secrets.FIREBASE_SERVICE_ACCOUNT;
    const databaseUrl = secrets.FIREBASE_DATABASE_URL;

    if (!serviceAccountJson || !databaseUrl) {
      console.log(
        "[notification-stream] Firebase credentials not found in secrets"
      );
      return;
    }

    // Parse service account (it might be a string or object)
    const serviceAccount =
      typeof serviceAccountJson === "string"
        ? JSON.parse(serviceAccountJson)
        : serviceAccountJson;

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: databaseUrl,
      });
    }

    firebaseDb = admin.database();
    firebaseInitialized = true;
    console.log("[notification-stream] Firebase initialized successfully");
  } catch (error) {
    console.error("[notification-stream] Failed to initialize Firebase:", error);
  }
}

/**
 * Push notification to Firebase RTDB
 */
async function pushToFirebase(
  notification: NotificationRecord
): Promise<void> {
  if (!firebaseDb) {
    console.log("[notification-stream] Firebase not available, skipping push");
    return;
  }

  try {
    const ref = firebaseDb.ref(
      `notifications/${notification.recipientId}/${notification.id}`
    );
    await ref.set(notification);
    console.log(
      `[notification-stream] Pushed to Firebase: ${notification.id}`
    );
  } catch (error) {
    console.error("[notification-stream] Failed to push to Firebase:", error);
  }
}

/**
 * Create a notification record in DynamoDB and push to Firebase
 */
async function createNotification(
  input: NotificationInput
): Promise<NotificationRecord> {
  const now = new Date().toISOString();
  const id = uuidv4();

  const notification: NotificationRecord = {
    id,
    recipientId: input.recipientId,
    recipientType: input.recipientType,
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
  const item = {
    PK: { S: `TENANT#${input.recipientId}` },
    SK: { S: `NOTIF#${now}#${id}` },
    EntityType: { S: "NOTIFICATION" },
    id: { S: id },
    recipientId: { S: input.recipientId },
    recipientType: { S: input.recipientType },
    type: { S: input.type },
    title: { S: input.title },
    message: { S: input.message },
    isRead: { BOOL: false },
    createdAt: { S: now },
    updatedAt: { S: now },
    ...(input.link && { link: { S: input.link } }),
    ...(input.metadata && { metadata: { S: JSON.stringify(input.metadata) } }),
  };

  await dynamodb.send(
    new PutItemCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );

  console.log(
    `[notification-stream] Created notification ${id} for ${input.recipientId}`
  );

  // Push to Firebase for real-time delivery
  await pushToFirebase(notification);

  return notification;
}

/**
 * Handle new email event - create notification for expert
 */
async function handleNewEmail(email: EmailRecord): Promise<void> {
  console.log(
    `[notification-stream] Processing new email for expert: ${email.expertId}`
  );

  // Skip outgoing emails
  if (email.isOutgoing) {
    console.log("[notification-stream] Skipping outgoing email");
    return;
  }

  // Create sender display name
  const senderName = email.from.name || email.from.email;
  const senderEmail = email.from.email;

  // Create notification
  await createNotification({
    recipientId: email.expertId,
    recipientType: "expert",
    type: "email_received",
    title: `New email from ${senderName}`,
    message: email.subject || "(No subject)",
    link: `/srv/${email.expertId}/inbox`,
    metadata: {
      emailId: email.id,
      fromEmail: senderEmail,
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
    console.log("[notification-stream] No NewImage in record, skipping");
    return;
  }

  // Determine the source table and event type
  const eventName = record.eventName;
  const eventSourceARN = record.eventSourceARN || "";

  console.log(
    `[notification-stream] Processing ${eventName} from ${eventSourceARN}`
  );

  // Only process INSERT events
  if (eventName !== "INSERT") {
    console.log("[notification-stream] Not an INSERT event, skipping");
    return;
  }

  // Unmarshall the new image
  const newImage = unmarshall(
    record.dynamodb.NewImage as Record<string, AttributeValue>
  );

  // Check if this is from the emails table
  if (eventSourceARN.includes("yoga-go-emails")) {
    const email = newImage as EmailRecord;

    // Validate required fields
    if (!email.expertId || !email.from) {
      console.log(
        "[notification-stream] Missing required email fields, skipping"
      );
      return;
    }

    await handleNewEmail(email);
  }
  // Future: Add handlers for other event sources
  // else if (eventSourceARN.includes("yoga-go-discussions")) {
  //   await handleNewForumMessage(newImage);
  // }
}

/**
 * Lambda handler
 */
export async function handler(event: DynamoDBStreamEvent): Promise<void> {
  console.log(
    `[notification-stream] Processing ${event.Records.length} records`
  );

  // Initialize Firebase (lazy load)
  await initializeFirebase();

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error("[notification-stream] Error processing record:", error);
      // Don't throw - continue processing other records
    }
  }

  console.log("[notification-stream] Processing complete");
}
