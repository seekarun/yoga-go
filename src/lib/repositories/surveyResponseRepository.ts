/**
 * SurveyResponse repository for DynamoDB operations
 * Handles CRUD operations for survey responses
 *
 * PK: SURVEY_RESPONSE
 * SK: {surveyId}#{responseId}
 */

import { docClient, Tables, EntityType } from '../dynamodb';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { SurveyResponse } from '@/types';

// Helper to generate response SK
const generateSK = (surveyId: string, responseId: string) => `${surveyId}#${responseId}`;

// Helper to generate a unique response ID
const generateResponseId = () => `resp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new survey response
 */
export async function createSurveyResponse(
  input: Omit<SurveyResponse, 'id' | 'createdAt' | 'updatedAt'>
): Promise<SurveyResponse> {
  console.log(
    '[DBG][surveyResponseRepository] Creating survey response for survey:',
    input.surveyId
  );

  const now = new Date().toISOString();
  const responseId = generateResponseId();

  const response: SurveyResponse = {
    ...input,
    id: responseId,
    submittedAt: input.submittedAt || now,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    PK: EntityType.SURVEY_RESPONSE,
    SK: generateSK(input.surveyId, responseId),
    entityType: EntityType.SURVEY_RESPONSE,
    // GSI for querying by expertId
    GSI1PK: `EXPERT#${input.expertId}`,
    GSI1SK: `RESPONSE#${now}`,
    // GSI for querying by userId (if logged in)
    GSI2PK: input.userId ? `USER#${input.userId}` : `ANONYMOUS#${input.surveyId}`,
    GSI2SK: `RESPONSE#${now}`,
    // GSI for querying by responseId alone
    GSI3PK: `RESPONSEID#${responseId}`,
    GSI3SK: EntityType.SURVEY_RESPONSE,
    ...response,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][surveyResponseRepository] Survey response created:', responseId);
  return response;
}

/**
 * Get a survey response by ID (requires surveyId for direct lookup)
 */
export async function getSurveyResponseById(
  surveyId: string,
  responseId: string
): Promise<SurveyResponse | null> {
  console.log('[DBG][surveyResponseRepository] Getting survey response:', responseId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.SURVEY_RESPONSE,
        SK: generateSK(surveyId, responseId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][surveyResponseRepository] Survey response not found:', responseId);
    return null;
  }

  return mapToSurveyResponse(result.Item);
}

/**
 * Get a survey response by ID only (uses GSI3)
 */
export async function getSurveyResponseByIdOnly(
  responseId: string
): Promise<SurveyResponse | null> {
  console.log('[DBG][surveyResponseRepository] Getting survey response by ID only:', responseId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :gsi3pk',
      ExpressionAttributeValues: {
        ':gsi3pk': `RESPONSEID#${responseId}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][surveyResponseRepository] Survey response not found:', responseId);
    return null;
  }

  return mapToSurveyResponse(result.Items[0]);
}

/**
 * Get all responses for a survey
 */
export async function getResponsesBySurvey(surveyId: string): Promise<SurveyResponse[]> {
  console.log('[DBG][surveyResponseRepository] Getting responses for survey:', surveyId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': EntityType.SURVEY_RESPONSE,
        ':skPrefix': `${surveyId}#`,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const responses = (result.Items || []).map(mapToSurveyResponse);
  console.log('[DBG][surveyResponseRepository] Found', responses.length, 'responses');
  return responses;
}

/**
 * Get all responses for an expert (across all their surveys)
 */
export async function getResponsesByExpert(expertId: string): Promise<SurveyResponse[]> {
  console.log('[DBG][surveyResponseRepository] Getting responses for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1skPrefix)',
      ExpressionAttributeValues: {
        ':gsi1pk': `EXPERT#${expertId}`,
        ':gsi1skPrefix': 'RESPONSE#',
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const responses = (result.Items || []).map(mapToSurveyResponse);
  console.log('[DBG][surveyResponseRepository] Found', responses.length, 'responses for expert');
  return responses;
}

/**
 * Get all responses by a user
 */
export async function getResponsesByUser(userId: string): Promise<SurveyResponse[]> {
  console.log('[DBG][surveyResponseRepository] Getting responses by user:', userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :gsi2skPrefix)',
      ExpressionAttributeValues: {
        ':gsi2pk': `USER#${userId}`,
        ':gsi2skPrefix': 'RESPONSE#',
      },
      ScanIndexForward: false,
    })
  );

  const responses = (result.Items || []).map(mapToSurveyResponse);
  console.log('[DBG][surveyResponseRepository] Found', responses.length, 'responses by user');
  return responses;
}

/**
 * Check if user has already responded to a survey
 */
export async function hasUserResponded(surveyId: string, userId: string): Promise<boolean> {
  console.log('[DBG][surveyResponseRepository] Checking if user has responded:', {
    surveyId,
    userId,
  });

  const responses = await getResponsesByUser(userId);
  const hasResponded = responses.some(r => r.surveyId === surveyId);

  console.log('[DBG][surveyResponseRepository] User has responded:', hasResponded);
  return hasResponded;
}

/**
 * Delete a survey response
 */
export async function deleteSurveyResponse(surveyId: string, responseId: string): Promise<boolean> {
  console.log('[DBG][surveyResponseRepository] Deleting survey response:', responseId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.SURVEY_RESPONSE,
        SK: generateSK(surveyId, responseId),
      },
    })
  );

  console.log('[DBG][surveyResponseRepository] Survey response deleted:', responseId);
  return true;
}

/**
 * Map DynamoDB item to SurveyResponse type
 */
function mapToSurveyResponse(item: Record<string, unknown>): SurveyResponse {
  return {
    id: item.id as string,
    surveyId: item.surveyId as string,
    expertId: item.expertId as string,
    userId: item.userId as string | undefined,
    contactInfo: item.contactInfo as SurveyResponse['contactInfo'] | undefined,
    answers: (item.answers || []) as SurveyResponse['answers'],
    submittedAt: item.submittedAt as string,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
