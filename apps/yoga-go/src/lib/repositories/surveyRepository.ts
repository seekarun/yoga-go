/**
 * Survey repository for DynamoDB operations
 * Handles CRUD operations for surveys
 *
 * PK: SURVEY
 * SK: {expertId}#{surveyId}
 *
 * Status: draft | active | closed | archived
 */

import { docClient, Tables, EntityType } from '../dynamodb';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Survey, SurveyStatus } from '@/types';

// Helper to generate survey SK
const generateSK = (expertId: string, surveyId: string) => `${expertId}#${surveyId}`;

// Helper to generate a unique survey ID
const generateSurveyId = () => `survey_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Helper to generate GSI2SK based on status
const generateGSI2SK = (status: SurveyStatus, timestamp: string) =>
  `${status.toUpperCase()}#${timestamp}`;

/**
 * Create a new survey (status defaults to 'draft')
 */
export async function createSurvey(
  input: Omit<Survey, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: SurveyStatus }
): Promise<Survey> {
  console.log('[DBG][surveyRepository] Creating survey for expert:', input.expertId);

  const now = new Date().toISOString();
  const surveyId = generateSurveyId();
  const status = input.status || 'draft';

  const survey: Survey = {
    ...input,
    id: surveyId,
    status,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    PK: EntityType.SURVEY,
    SK: generateSK(input.expertId, surveyId),
    entityType: EntityType.SURVEY,
    // GSI for querying by surveyId alone
    GSI1PK: `SURVEYID#${surveyId}`,
    GSI1SK: EntityType.SURVEY,
    // GSI for querying surveys by expert and status
    GSI2PK: `EXPERT#${input.expertId}`,
    GSI2SK: generateGSI2SK(status, now),
    ...survey,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][surveyRepository] Survey created:', surveyId, 'status:', status);
  return survey;
}

/**
 * Get a survey by ID (requires expertId for direct lookup)
 */
export async function getSurveyById(expertId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Getting survey:', surveyId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.SURVEY,
        SK: generateSK(expertId, surveyId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][surveyRepository] Survey not found:', surveyId);
    return null;
  }

  return mapToSurvey(result.Item);
}

/**
 * Get a survey by ID only (uses GSI1)
 */
export async function getSurveyByIdOnly(surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Getting survey by ID only:', surveyId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `SURVEYID#${surveyId}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][surveyRepository] Survey not found:', surveyId);
    return null;
  }

  return mapToSurvey(result.Items[0]);
}

/**
 * Get all surveys for an expert (excludes archived by default)
 */
export async function getSurveysByExpert(
  expertId: string,
  includeArchived: boolean = false
): Promise<Survey[]> {
  console.log('[DBG][surveyRepository] Getting surveys for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': EntityType.SURVEY,
        ':skPrefix': `${expertId}#`,
      },
      ScanIndexForward: false,
    })
  );

  let surveys = (result.Items || []).map(mapToSurvey);

  // Filter out archived unless requested
  if (!includeArchived) {
    surveys = surveys.filter(s => s.status !== 'archived');
  }

  console.log('[DBG][surveyRepository] Found', surveys.length, 'surveys');
  return surveys;
}

/**
 * Get surveys by status for an expert
 */
export async function getSurveysByExpertByStatus(
  expertId: string,
  status: SurveyStatus
): Promise<Survey[]> {
  console.log('[DBG][surveyRepository] Getting', status, 'surveys for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :gsi2skPrefix)',
      ExpressionAttributeValues: {
        ':gsi2pk': `EXPERT#${expertId}`,
        ':gsi2skPrefix': `${status.toUpperCase()}#`,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const surveys = (result.Items || []).map(mapToSurvey);
  console.log('[DBG][surveyRepository] Found', surveys.length, status, 'surveys');
  return surveys;
}

/**
 * Get all active surveys for an expert (can have multiple)
 */
export async function getActiveSurveysByExpert(expertId: string): Promise<Survey[]> {
  return getSurveysByExpertByStatus(expertId, 'active');
}

/**
 * Get single active survey for an expert (for backward compatibility)
 * @deprecated Use getActiveSurveysByExpert instead
 */
export async function getActiveSurveyByExpert(expertId: string): Promise<Survey | null> {
  const surveys = await getActiveSurveysByExpert(expertId);
  return surveys.length > 0 ? surveys[0] : null;
}

/**
 * Update a survey
 */
export async function updateSurvey(
  expertId: string,
  surveyId: string,
  updates: Partial<
    Pick<Survey, 'title' | 'description' | 'contactInfo' | 'questions' | 'status' | 'responseCount'>
  >
): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Updating survey:', surveyId);

  const now = new Date().toISOString();
  const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
  const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
  const expressionAttributeValues: Record<string, unknown> = { ':updatedAt': now };

  if (updates.title !== undefined) {
    updateExpressions.push('#title = :title');
    expressionAttributeNames['#title'] = 'title';
    expressionAttributeValues[':title'] = updates.title;
  }
  if (updates.description !== undefined) {
    updateExpressions.push('#description = :description');
    expressionAttributeNames['#description'] = 'description';
    expressionAttributeValues[':description'] = updates.description;
  }
  if (updates.contactInfo !== undefined) {
    updateExpressions.push('#contactInfo = :contactInfo');
    expressionAttributeNames['#contactInfo'] = 'contactInfo';
    expressionAttributeValues[':contactInfo'] = updates.contactInfo;
  }
  if (updates.questions !== undefined) {
    updateExpressions.push('#questions = :questions');
    expressionAttributeNames['#questions'] = 'questions';
    expressionAttributeValues[':questions'] = updates.questions;
  }
  if (updates.responseCount !== undefined) {
    updateExpressions.push('#responseCount = :responseCount');
    expressionAttributeNames['#responseCount'] = 'responseCount';
    expressionAttributeValues[':responseCount'] = updates.responseCount;
  }
  if (updates.status !== undefined) {
    updateExpressions.push('#status = :status');
    updateExpressions.push('#GSI2SK = :gsi2sk');
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeNames['#GSI2SK'] = 'GSI2SK';
    expressionAttributeValues[':status'] = updates.status;
    expressionAttributeValues[':gsi2sk'] = generateGSI2SK(updates.status, now);

    // Set closedAt if closing
    if (updates.status === 'closed') {
      updateExpressions.push('#closedAt = :closedAt');
      expressionAttributeNames['#closedAt'] = 'closedAt';
      expressionAttributeValues[':closedAt'] = now;
    }
    // Set archivedAt if archiving
    if (updates.status === 'archived') {
      updateExpressions.push('#archivedAt = :archivedAt');
      expressionAttributeNames['#archivedAt'] = 'archivedAt';
      expressionAttributeValues[':archivedAt'] = now;
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.SURVEY,
        SK: generateSK(expertId, surveyId),
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    console.log('[DBG][surveyRepository] Survey not found for update:', surveyId);
    return null;
  }

  console.log('[DBG][surveyRepository] Survey updated:', surveyId);
  return mapToSurvey(result.Attributes);
}

/**
 * Publish a survey (draft -> active)
 */
export async function publishSurvey(expertId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Publishing survey:', surveyId);
  return updateSurvey(expertId, surveyId, { status: 'active' });
}

/**
 * Close a survey (active -> closed)
 */
export async function closeSurvey(expertId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Closing survey:', surveyId);
  return updateSurvey(expertId, surveyId, { status: 'closed' });
}

/**
 * Reopen a survey (closed -> active)
 */
export async function reopenSurvey(expertId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Reopening survey:', surveyId);
  return updateSurvey(expertId, surveyId, { status: 'active' });
}

/**
 * Archive a survey (soft delete)
 */
export async function archiveSurvey(expertId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Archiving survey:', surveyId);
  return updateSurvey(expertId, surveyId, { status: 'archived' });
}

/**
 * Increment response count for a survey
 */
export async function incrementResponseCount(
  expertId: string,
  surveyId: string
): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Incrementing response count for survey:', surveyId);

  const now = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.SURVEY,
        SK: generateSK(expertId, surveyId),
      },
      UpdateExpression:
        'SET #responseCount = if_not_exists(#responseCount, :zero) + :inc, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#responseCount': 'responseCount',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':inc': 1,
        ':zero': 0,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    return null;
  }

  return mapToSurvey(result.Attributes);
}

/**
 * Delete a survey (hard delete - use archiveSurvey for soft delete)
 */
export async function deleteSurvey(expertId: string, surveyId: string): Promise<boolean> {
  console.log('[DBG][surveyRepository] Deleting survey:', surveyId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.SURVEY,
        SK: generateSK(expertId, surveyId),
      },
    })
  );

  console.log('[DBG][surveyRepository] Survey deleted:', surveyId);
  return true;
}

/**
 * Map DynamoDB item to Survey type
 */
function mapToSurvey(item: Record<string, unknown>): Survey {
  // Handle backward compatibility: convert isActive to status
  let status: SurveyStatus = (item.status as SurveyStatus) || 'active';
  if (!item.status && item.isActive !== undefined) {
    status = item.isActive ? 'active' : 'closed';
  }

  return {
    id: item.id as string,
    expertId: item.expertId as string,
    title: item.title as string,
    description: item.description as string | undefined,
    contactInfo: item.contactInfo as Survey['contactInfo'] | undefined,
    questions: (item.questions || []) as Survey['questions'],
    status,
    closedAt: item.closedAt as string | undefined,
    archivedAt: item.archivedAt as string | undefined,
    responseCount: (item.responseCount as number) || 0,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
