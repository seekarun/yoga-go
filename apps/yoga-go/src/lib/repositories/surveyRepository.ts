/**
 * Survey repository for DynamoDB operations
 * Handles CRUD operations for surveys
 *
 * PK: SURVEY
 * SK: {expertId}#{surveyId}
 */

import { docClient, Tables, EntityType } from '../dynamodb';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Survey } from '@/types';

// Helper to generate survey SK
const generateSK = (expertId: string, surveyId: string) => `${expertId}#${surveyId}`;

// Helper to generate a unique survey ID
const generateSurveyId = () => `survey_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new survey
 */
export async function createSurvey(
  input: Omit<Survey, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Survey> {
  console.log('[DBG][surveyRepository] Creating survey for expert:', input.expertId);

  const now = new Date().toISOString();
  const surveyId = generateSurveyId();

  const survey: Survey = {
    ...input,
    id: surveyId,
    isActive: input.isActive ?? true,
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
    // GSI for querying active surveys by expert
    GSI2PK: `EXPERT#${input.expertId}`,
    GSI2SK: input.isActive ? `ACTIVE#${now}` : `INACTIVE#${now}`,
    ...survey,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][surveyRepository] Survey created:', surveyId);
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
 * Get all surveys for an expert
 */
export async function getSurveysByExpert(expertId: string): Promise<Survey[]> {
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

  const surveys = (result.Items || []).map(mapToSurvey);
  console.log('[DBG][surveyRepository] Found', surveys.length, 'surveys');
  return surveys;
}

/**
 * Get active survey for an expert
 */
export async function getActiveSurveyByExpert(expertId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Getting active survey for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :gsi2skPrefix)',
      ExpressionAttributeValues: {
        ':gsi2pk': `EXPERT#${expertId}`,
        ':gsi2skPrefix': 'ACTIVE#',
      },
      Limit: 1,
      ScanIndexForward: false, // Most recent active survey
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][surveyRepository] No active survey found for expert:', expertId);
    return null;
  }

  return mapToSurvey(result.Items[0]);
}

/**
 * Update a survey
 */
export async function updateSurvey(
  expertId: string,
  surveyId: string,
  updates: Partial<Pick<Survey, 'title' | 'description' | 'contactInfo' | 'questions' | 'isActive'>>
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
  if (updates.isActive !== undefined) {
    updateExpressions.push('#isActive = :isActive');
    updateExpressions.push('#GSI2SK = :gsi2sk');
    expressionAttributeNames['#isActive'] = 'isActive';
    expressionAttributeNames['#GSI2SK'] = 'GSI2SK';
    expressionAttributeValues[':isActive'] = updates.isActive;
    expressionAttributeValues[':gsi2sk'] = updates.isActive ? `ACTIVE#${now}` : `INACTIVE#${now}`;
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
 * Delete a survey
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
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    title: item.title as string,
    description: item.description as string | undefined,
    contactInfo: item.contactInfo as Survey['contactInfo'] | undefined,
    questions: (item.questions || []) as Survey['questions'],
    isActive: (item.isActive as boolean) ?? true,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
