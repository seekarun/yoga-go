/**
 * Transcript Repository for Cally - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "TRANSCRIPT#{eventId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type {
  MeetingTranscript,
  TranscriptStatus,
  CreateTranscriptInput,
} from "@/types";

// DynamoDB item type
interface DynamoDBTranscriptItem extends MeetingTranscript {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Convert DynamoDB item to MeetingTranscript (removes PK/SK)
 */
function toTranscript(item: DynamoDBTranscriptItem): MeetingTranscript {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, entityType, ...transcript } = item;
  return transcript as MeetingTranscript;
}

/**
 * Create a new transcript record
 */
export async function createTranscript(
  tenantId: string,
  input: CreateTranscriptInput,
): Promise<MeetingTranscript> {
  const now = new Date().toISOString();

  const transcript: MeetingTranscript = {
    id: input.eventId,
    tenantId,
    eventId: input.eventId,
    eventTitle: input.eventTitle,
    eventDate: input.eventDate,
    status: "uploading",
    audioFileKey: input.audioFileKey,
    audioFileSizeBytes: input.audioFileSizeBytes,
    createdAt: now,
    updatedAt: now,
  };

  console.log(
    "[DBG][transcriptRepository] Creating transcript for event:",
    input.eventId,
    "tenant:",
    tenantId,
  );

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.TRANSCRIPT(input.eventId),
        entityType: EntityType.TRANSCRIPT,
        ...transcript,
      },
    }),
  );

  console.log("[DBG][transcriptRepository] Transcript created successfully");
  return transcript;
}

/**
 * Get transcript by event ID
 */
export async function getTranscript(
  tenantId: string,
  eventId: string,
): Promise<MeetingTranscript | null> {
  console.log(
    "[DBG][transcriptRepository] Getting transcript for event:",
    eventId,
    "tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.TRANSCRIPT(eventId),
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][transcriptRepository] Transcript not found");
    return null;
  }

  return toTranscript(result.Item as DynamoDBTranscriptItem);
}

/**
 * Update transcript status with optional additional fields
 */
export async function updateTranscriptStatus(
  tenantId: string,
  eventId: string,
  status: TranscriptStatus,
  updates?: Partial<
    Pick<
      MeetingTranscript,
      | "transcriptText"
      | "summary"
      | "topics"
      | "audioDurationSeconds"
      | "errorMessage"
      | "completedAt"
    >
  >,
): Promise<void> {
  console.log(
    "[DBG][transcriptRepository] Updating transcript status:",
    status,
    "for event:",
    eventId,
  );

  const now = new Date().toISOString();
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
    ":updatedAt": now,
  };

  if (updates) {
    if (updates.transcriptText !== undefined) {
      updateExpressions.push("#transcriptText = :transcriptText");
      expressionNames["#transcriptText"] = "transcriptText";
      expressionValues[":transcriptText"] = updates.transcriptText;
    }
    if (updates.summary !== undefined) {
      updateExpressions.push("#summary = :summary");
      expressionNames["#summary"] = "summary";
      expressionValues[":summary"] = updates.summary;
    }
    if (updates.topics !== undefined) {
      updateExpressions.push("#topics = :topics");
      expressionNames["#topics"] = "topics";
      expressionValues[":topics"] = updates.topics;
    }
    if (updates.audioDurationSeconds !== undefined) {
      updateExpressions.push("#audioDurationSeconds = :audioDurationSeconds");
      expressionNames["#audioDurationSeconds"] = "audioDurationSeconds";
      expressionValues[":audioDurationSeconds"] = updates.audioDurationSeconds;
    }
    if (updates.errorMessage !== undefined) {
      updateExpressions.push("#errorMessage = :errorMessage");
      expressionNames["#errorMessage"] = "errorMessage";
      expressionValues[":errorMessage"] = updates.errorMessage;
    }
    if (updates.completedAt !== undefined) {
      updateExpressions.push("#completedAt = :completedAt");
      expressionNames["#completedAt"] = "completedAt";
      expressionValues[":completedAt"] = updates.completedAt;
    }
  }

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.TRANSCRIPT(eventId),
      },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
    }),
  );

  console.log("[DBG][transcriptRepository] Transcript status updated");
}

/**
 * Get all transcripts for a tenant
 */
export async function getTranscriptsByTenant(
  tenantId: string,
): Promise<MeetingTranscript[]> {
  console.log(
    "[DBG][transcriptRepository] Querying transcripts for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.TRANSCRIPT_PREFIX,
      },
      ScanIndexForward: false,
    }),
  );

  const items = (result.Items || []) as DynamoDBTranscriptItem[];
  console.log("[DBG][transcriptRepository] Found", items.length, "transcripts");
  return items.map(toTranscript);
}
