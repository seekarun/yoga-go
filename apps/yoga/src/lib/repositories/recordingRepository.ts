/**
 * Recording Repository - DynamoDB Operations
 *
 * Stores imported recordings from Zoom/Google Meet in CORE table:
 * - PK: "RECORDING#{expertId}"
 * - SK: "{createdAt}#{recordingId}" (sorted by date, most recent first)
 *
 * GSI1 for webinar lookup:
 * - GSI1PK: "WEBINAR_REC#{webinarId}"
 * - GSI1SK: "{sessionId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables } from '../dynamodb';
import type {
  Recording,
  RecordingSource,
  RecordingImportStatus,
  RecordingListResult,
  RecordingFilters,
} from '@/types';

// PK patterns for recordings
export const RecordingPK = {
  EXPERT: (expertId: string) => `RECORDING#${expertId}`,
  WEBINAR: (webinarId: string) => `WEBINAR_REC#${webinarId}`,
};

// Type for DynamoDB Recording item (includes PK/SK)
interface DynamoDBRecordingItem extends Recording {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
}

// Input for creating a new recording
export interface CreateRecordingInput {
  id: string;
  expertId: string;
  source: RecordingSource;
  sourceId: string;
  sourceMeetingTopic?: string;
  title: string;
  description?: string;
  duration: number;
  fileSize: number;
  downloadUrl?: string;
  webinarId?: string;
  sessionId?: string;
  recordedAt?: string;
}

/**
 * Convert DynamoDB item to Recording type (removes PK/SK/GSI keys)
 */
function toRecording(item: DynamoDBRecordingItem): Recording {
  const { PK, SK, GSI1PK, GSI1SK, ...recording } = item;
  // Suppress unused variable warnings
  void PK;
  void SK;
  void GSI1PK;
  void GSI1SK;
  return recording as Recording;
}

/**
 * Create a new recording record
 */
export async function createRecording(input: CreateRecordingInput): Promise<Recording> {
  console.log('[DBG][recordingRepository] Creating recording:', input.id);

  const now = new Date().toISOString();
  const recording: DynamoDBRecordingItem = {
    PK: RecordingPK.EXPERT(input.expertId),
    SK: `${now}#${input.id}`,
    // Entity fields
    id: input.id,
    expertId: input.expertId,
    source: input.source,
    sourceId: input.sourceId,
    sourceMeetingTopic: input.sourceMeetingTopic,
    title: input.title,
    description: input.description,
    duration: input.duration,
    fileSize: input.fileSize,
    downloadUrl: input.downloadUrl,
    status: 'pending',
    webinarId: input.webinarId,
    sessionId: input.sessionId,
    recordedAt: input.recordedAt,
    importedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  // Add GSI1 if linked to webinar
  if (input.webinarId) {
    recording.GSI1PK = RecordingPK.WEBINAR(input.webinarId);
    recording.GSI1SK = input.sessionId || input.id;
  }

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: recording,
    })
  );

  console.log('[DBG][recordingRepository] Created recording:', input.id);
  return toRecording(recording);
}

/**
 * Get recordings by expert ID with pagination and filters
 */
export async function getRecordingsByExpert(
  expertId: string,
  filters?: RecordingFilters
): Promise<RecordingListResult> {
  console.log('[DBG][recordingRepository] Getting recordings for expert:', expertId);

  const limit = filters?.limit ?? 20;

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': RecordingPK.EXPERT(expertId),
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
      ExclusiveStartKey: filters?.lastKey
        ? JSON.parse(Buffer.from(filters.lastKey, 'base64').toString())
        : undefined,
    })
  );

  let recordings = (result.Items || []).map(item => toRecording(item as DynamoDBRecordingItem));

  // Apply filters
  if (filters?.source) {
    recordings = recordings.filter(r => r.source === filters.source);
  }
  if (filters?.status) {
    recordings = recordings.filter(r => r.status === filters.status);
  }
  if (filters?.webinarId) {
    recordings = recordings.filter(r => r.webinarId === filters.webinarId);
  }
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    recordings = recordings.filter(
      r =>
        r.title.toLowerCase().includes(searchLower) ||
        r.sourceMeetingTopic?.toLowerCase().includes(searchLower)
    );
  }

  const lastKey = result.LastEvaluatedKey
    ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
    : undefined;

  console.log('[DBG][recordingRepository] Found', recordings.length, 'recordings');

  return {
    recordings,
    totalCount: recordings.length,
    lastKey,
  };
}

/**
 * Get single recording by ID
 */
export async function getRecordingById(
  recordingId: string,
  expertId: string
): Promise<Recording | null> {
  console.log('[DBG][recordingRepository] Getting recording by id:', recordingId);

  // Query to find the recording (since we don't know the exact SK timestamp)
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :recordingId',
      ExpressionAttributeValues: {
        ':pk': RecordingPK.EXPERT(expertId),
        ':recordingId': recordingId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][recordingRepository] Recording not found');
    return null;
  }

  console.log('[DBG][recordingRepository] Found recording:', recordingId);
  return toRecording(result.Items[0] as DynamoDBRecordingItem);
}

/**
 * Get recordings by webinar ID (via GSI1)
 */
export async function getRecordingsByWebinar(webinarId: string): Promise<Recording[]> {
  console.log('[DBG][recordingRepository] Getting recordings for webinar:', webinarId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': RecordingPK.WEBINAR(webinarId),
      },
    })
  );

  const recordings = (result.Items || []).map(item => toRecording(item as DynamoDBRecordingItem));
  console.log('[DBG][recordingRepository] Found', recordings.length, 'recordings for webinar');

  return recordings;
}

/**
 * Update recording status
 */
export async function updateRecordingStatus(
  recordingId: string,
  expertId: string,
  status: RecordingImportStatus,
  additionalUpdates?: {
    cloudflareStreamId?: string;
    cloudflarePlaybackUrl?: string;
    thumbnailUrl?: string;
    statusMessage?: string;
    processedAt?: string;
  }
): Promise<Recording | null> {
  console.log('[DBG][recordingRepository] Updating recording status:', recordingId, status);

  // First find the recording to get the SK
  const existing = await getRecordingById(recordingId, expertId);
  if (!existing) {
    console.log('[DBG][recordingRepository] Recording not found for update');
    return null;
  }

  const updateExpressions: string[] = ['#status = :status', '#updatedAt = :updatedAt'];
  const expressionNames: Record<string, string> = {
    '#status': 'status',
    '#updatedAt': 'updatedAt',
  };
  const expressionValues: Record<string, unknown> = {
    ':status': status,
    ':updatedAt': new Date().toISOString(),
  };

  if (additionalUpdates?.cloudflareStreamId) {
    updateExpressions.push('#cfStreamId = :cfStreamId');
    expressionNames['#cfStreamId'] = 'cloudflareStreamId';
    expressionValues[':cfStreamId'] = additionalUpdates.cloudflareStreamId;
  }

  if (additionalUpdates?.cloudflarePlaybackUrl) {
    updateExpressions.push('#cfPlaybackUrl = :cfPlaybackUrl');
    expressionNames['#cfPlaybackUrl'] = 'cloudflarePlaybackUrl';
    expressionValues[':cfPlaybackUrl'] = additionalUpdates.cloudflarePlaybackUrl;
  }

  if (additionalUpdates?.thumbnailUrl) {
    updateExpressions.push('#thumbnailUrl = :thumbnailUrl');
    expressionNames['#thumbnailUrl'] = 'thumbnailUrl';
    expressionValues[':thumbnailUrl'] = additionalUpdates.thumbnailUrl;
  }

  if (additionalUpdates?.statusMessage) {
    updateExpressions.push('#statusMessage = :statusMessage');
    expressionNames['#statusMessage'] = 'statusMessage';
    expressionValues[':statusMessage'] = additionalUpdates.statusMessage;
  }

  if (additionalUpdates?.processedAt) {
    updateExpressions.push('#processedAt = :processedAt');
    expressionNames['#processedAt'] = 'processedAt';
    expressionValues[':processedAt'] = additionalUpdates.processedAt;
  }

  // Use the createdAt from existing record to construct SK
  const sk = `${existing.createdAt}#${recordingId}`;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: RecordingPK.EXPERT(expertId),
        SK: sk,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    console.log('[DBG][recordingRepository] Update failed');
    return null;
  }

  console.log('[DBG][recordingRepository] Updated recording:', recordingId);
  return toRecording(result.Attributes as DynamoDBRecordingItem);
}

/**
 * Update recording metadata (title, description, course linking)
 */
export async function updateRecording(
  recordingId: string,
  expertId: string,
  updates: {
    title?: string;
    description?: string;
    courseId?: string;
    lessonId?: string;
  }
): Promise<Recording | null> {
  console.log('[DBG][recordingRepository] Updating recording:', recordingId, updates);

  // First find the recording to get the SK
  const existing = await getRecordingById(recordingId, expertId);
  if (!existing) {
    console.log('[DBG][recordingRepository] Recording not found for update');
    return null;
  }

  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const expressionValues: Record<string, unknown> = {
    ':updatedAt': new Date().toISOString(),
  };

  if (updates.title !== undefined) {
    updateExpressions.push('#title = :title');
    expressionNames['#title'] = 'title';
    expressionValues[':title'] = updates.title;
  }

  if (updates.description !== undefined) {
    updateExpressions.push('#description = :description');
    expressionNames['#description'] = 'description';
    expressionValues[':description'] = updates.description;
  }

  if (updates.courseId !== undefined) {
    updateExpressions.push('#courseId = :courseId');
    expressionNames['#courseId'] = 'courseId';
    expressionValues[':courseId'] = updates.courseId;
  }

  if (updates.lessonId !== undefined) {
    updateExpressions.push('#lessonId = :lessonId');
    expressionNames['#lessonId'] = 'lessonId';
    expressionValues[':lessonId'] = updates.lessonId;
  }

  const sk = `${existing.createdAt}#${recordingId}`;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: RecordingPK.EXPERT(expertId),
        SK: sk,
      },
      UpdateExpression: 'SET ' + updateExpressions.join(', '),
      ExpressionAttributeNames: expressionNames,
      ExpressionAttributeValues: expressionValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    console.log('[DBG][recordingRepository] Update failed');
    return null;
  }

  console.log('[DBG][recordingRepository] Updated recording:', recordingId);
  return toRecording(result.Attributes as DynamoDBRecordingItem);
}

/**
 * Delete a recording
 */
export async function deleteRecording(recordingId: string, expertId: string): Promise<boolean> {
  console.log('[DBG][recordingRepository] Deleting recording:', recordingId);

  // First find the recording to get the SK
  const existing = await getRecordingById(recordingId, expertId);
  if (!existing) {
    console.log('[DBG][recordingRepository] Recording not found for deletion');
    return false;
  }

  const sk = `${existing.createdAt}#${recordingId}`;

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: RecordingPK.EXPERT(expertId),
        SK: sk,
      },
    })
  );

  console.log('[DBG][recordingRepository] Deleted recording:', recordingId);
  return true;
}

/**
 * Find recording by source ID (Zoom meeting ID or Google Drive file ID)
 */
export async function findRecordingBySourceId(
  expertId: string,
  sourceId: string
): Promise<Recording | null> {
  console.log('[DBG][recordingRepository] Finding recording by source ID:', sourceId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'sourceId = :sourceId',
      ExpressionAttributeValues: {
        ':pk': RecordingPK.EXPERT(expertId),
        ':sourceId': sourceId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][recordingRepository] Recording not found by source ID');
    return null;
  }

  console.log('[DBG][recordingRepository] Found recording by source ID');
  return toRecording(result.Items[0] as DynamoDBRecordingItem);
}
