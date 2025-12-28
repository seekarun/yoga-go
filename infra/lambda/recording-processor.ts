/**
 * Recording Processor Lambda
 *
 * Processes recording import messages from SQS:
 * 1. Fetches recording details from DynamoDB
 * 2. Downloads recording from Zoom (using stored OAuth tokens)
 * 3. Uploads to Cloudflare Stream
 * 4. Updates recording status in DynamoDB
 *
 * SQS Message format:
 * {
 *   recordingId: string;
 *   expertId: string;
 *   downloadUrl: string;
 *   accessToken: string;
 * }
 */

import type { SQSEvent, SQSRecord } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";

// AWS clients
const ddbClient = new DynamoDBClient({ region: "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const secretsManager = new SecretsManagerClient({ region: "ap-southeast-2" });

// Environment variables
const TABLE_NAME = process.env.DYNAMODB_TABLE || "yoga-go-core";
const SECRETS_NAME = "yoga-go/production";

// Cloudflare API
const CLOUDFLARE_API_BASE = "https://api.cloudflare.com/client/v4";

// Types
interface RecordingMessage {
  recordingId: string;
  expertId: string;
  downloadUrl: string;
  accessToken: string;
}

interface CloudflareSecrets {
  CF_TOKEN: string;
  CF_ACCOUNT_ID: string;
  ZOOM_CLIENT_ID?: string;
  ZOOM_CLIENT_SECRET?: string;
}

interface RecordingItem {
  PK: string;
  SK: string;
  id: string;
  expertId: string;
  source: string;
  sourceId: string;
  title: string;
  duration: number;
  fileSize: number;
  downloadUrl?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CloudflareUploadResult {
  uid: string;
  thumbnail?: string;
  status?: { state: string };
}

/**
 * Get secrets from Secrets Manager
 */
async function getSecrets(): Promise<CloudflareSecrets> {
  console.log("[recording-processor] Fetching secrets");

  const result = await secretsManager.send(
    new GetSecretValueCommand({
      SecretId: SECRETS_NAME,
    }),
  );

  if (!result.SecretString) {
    throw new Error("Secrets not found");
  }

  return JSON.parse(result.SecretString) as CloudflareSecrets;
}

/**
 * Get recording from DynamoDB
 */
async function getRecording(
  expertId: string,
  recordingId: string,
): Promise<RecordingItem | null> {
  console.log("[recording-processor] Getting recording:", recordingId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      FilterExpression: "id = :recordingId",
      ExpressionAttributeValues: {
        ":pk": `RECORDING#${expertId}`,
        ":recordingId": recordingId,
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[recording-processor] Recording not found");
    return null;
  }

  return result.Items[0] as RecordingItem;
}

/**
 * Update recording status in DynamoDB
 */
async function updateRecordingStatus(
  recording: RecordingItem,
  status: string,
  additionalUpdates?: Record<string, unknown>,
): Promise<void> {
  console.log("[recording-processor] Updating status to:", status);

  const updateExpressions: string[] = [
    "#status = :status",
    "#updatedAt = :updatedAt",
  ];
  const expressionNames: Record<string, string> = {
    "#status": "status",
    "#updatedAt": "updatedAt",
  };
  const expressionValues: Record<string, unknown> = {
    ":status": status,
    ":updatedAt": new Date().toISOString(),
  };

  if (additionalUpdates) {
    let index = 0;
    for (const [key, value] of Object.entries(additionalUpdates)) {
      updateExpressions.push(`#k${index} = :v${index}`);
      expressionNames[`#k${index}`] = key;
      expressionValues[`:v${index}`] = value;
      index++;
    }
  }

  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: recording.PK,
        SK: recording.SK,
      },
      UpdateExpression: "SET " + updateExpressions.join(", "),
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    }),
  );

  console.log("[recording-processor] Status updated");
}

/**
 * Refresh Zoom access token using refresh token
 */
async function refreshZoomToken(
  expertId: string,
  refreshToken: string,
  secrets: CloudflareSecrets,
): Promise<string> {
  console.log("[recording-processor] Refreshing Zoom token for:", expertId);

  if (!secrets.ZOOM_CLIENT_ID || !secrets.ZOOM_CLIENT_SECRET) {
    throw new Error("Zoom OAuth credentials not configured");
  }

  const response = await fetch("https://zoom.us/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${secrets.ZOOM_CLIENT_ID}:${secrets.ZOOM_CLIENT_SECRET}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh Zoom token: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Update tokens in DynamoDB
  const expiresAt = new Date(
    Date.now() + data.expires_in * 1000,
  ).toISOString();
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: "ZOOM_AUTH",
        SK: expertId,
      },
      UpdateExpression:
        "SET accessToken = :accessToken, refreshToken = :refreshToken, expiresAt = :expiresAt, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":accessToken": data.access_token,
        ":refreshToken": data.refresh_token,
        ":expiresAt": expiresAt,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );

  console.log("[recording-processor] Zoom token refreshed");
  return data.access_token;
}

/**
 * Get Zoom auth for expert
 */
async function getZoomAuth(
  expertId: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: string } | null> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk AND SK = :sk",
      ExpressionAttributeValues: {
        ":pk": "ZOOM_AUTH",
        ":sk": expertId,
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  const item = result.Items[0] as Record<string, unknown>;
  return {
    accessToken: item.accessToken as string,
    refreshToken: item.refreshToken as string,
    expiresAt: item.expiresAt as string,
  };
}

/**
 * Upload video to Cloudflare Stream from URL
 */
async function uploadToCloudflare(
  downloadUrl: string,
  accessToken: string,
  meta: Record<string, string>,
  secrets: CloudflareSecrets,
): Promise<CloudflareUploadResult> {
  console.log("[recording-processor] Uploading to Cloudflare Stream");

  // Zoom download URLs require the access token as a query parameter
  const urlWithAuth = `${downloadUrl}?access_token=${accessToken}`;

  const response = await fetch(
    `${CLOUDFLARE_API_BASE}/accounts/${secrets.CF_ACCOUNT_ID}/stream/copy`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secrets.CF_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: urlWithAuth,
        meta,
        requireSignedURLs: false,
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[recording-processor] Cloudflare error:", errorText);
    throw new Error(`Cloudflare upload failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    success: boolean;
    result: CloudflareUploadResult;
    errors: Array<{ message: string }>;
  };

  if (!data.success) {
    throw new Error(
      `Cloudflare upload failed: ${data.errors?.[0]?.message || "Unknown error"}`,
    );
  }

  console.log("[recording-processor] Upload started:", data.result.uid);
  return data.result;
}

/**
 * Process a single recording message
 */
async function processRecording(message: RecordingMessage): Promise<void> {
  console.log("[recording-processor] Processing recording:", message.recordingId);

  // Get secrets
  const secrets = await getSecrets();

  // Get recording from DynamoDB
  const recording = await getRecording(message.expertId, message.recordingId);
  if (!recording) {
    console.log("[recording-processor] Recording not found, skipping");
    return;
  }

  // Skip if already processed
  if (recording.status === "ready" || recording.status === "failed") {
    console.log("[recording-processor] Recording already processed:", recording.status);
    return;
  }

  try {
    // Update status to downloading
    await updateRecordingStatus(recording, "downloading");

    // Get/refresh Zoom token
    let accessToken = message.accessToken;
    const zoomAuth = await getZoomAuth(message.expertId);

    if (zoomAuth) {
      const expiresAt = new Date(zoomAuth.expiresAt);
      const now = new Date();
      const bufferMs = 5 * 60 * 1000; // 5 minute buffer

      if (expiresAt.getTime() - now.getTime() < bufferMs) {
        console.log("[recording-processor] Token expired, refreshing");
        accessToken = await refreshZoomToken(
          message.expertId,
          zoomAuth.refreshToken,
          secrets,
        );
      } else {
        accessToken = zoomAuth.accessToken;
      }
    }

    // Update status to uploading
    await updateRecordingStatus(recording, "uploading");

    // Upload to Cloudflare Stream
    const uploadResult = await uploadToCloudflare(
      message.downloadUrl,
      accessToken,
      {
        recordingId: message.recordingId,
        expertId: message.expertId,
        title: recording.title,
      },
      secrets,
    );

    // Update recording with Cloudflare details
    await updateRecordingStatus(recording, "processing", {
      cloudflareStreamId: uploadResult.uid,
      processedAt: new Date().toISOString(),
    });

    console.log("[recording-processor] Recording queued for processing:", uploadResult.uid);
  } catch (error) {
    console.error("[recording-processor] Error processing recording:", error);

    // Update status to failed
    await updateRecordingStatus(recording, "failed", {
      statusMessage:
        error instanceof Error ? error.message : "Unknown error occurred",
    });

    // Re-throw to trigger SQS retry
    throw error;
  }
}

/**
 * Process a single SQS record
 */
async function processRecord(record: SQSRecord): Promise<void> {
  const message = JSON.parse(record.body) as RecordingMessage;
  await processRecording(message);
}

/**
 * Lambda handler
 */
export async function handler(event: SQSEvent): Promise<void> {
  console.log(`[recording-processor] Processing ${event.Records.length} record(s)`);

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error("[recording-processor] Error processing record:", error);
      // Let SQS retry the message
      throw error;
    }
  }

  console.log("[recording-processor] Finished processing");
}
