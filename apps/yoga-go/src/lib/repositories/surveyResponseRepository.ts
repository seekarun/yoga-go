/**
 * SurveyResponse repository for DynamoDB operations
 * Handles CRUD operations for survey responses
 *
 * Tenant-partitioned design:
 * - PK: TENANT#{tenantId}
 * - SK: SURVEYRESP#{surveyId}#{responseId}
 */

import { docClient, Tables, CorePK } from '../dynamodb';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { SurveyResponse, SurveyResponseMetadata } from '@/types';

// Helper to generate a unique response ID
const generateResponseId = () => `resp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Input type for creating a survey response
export interface CreateSurveyResponseInput {
  surveyId: string;
  userId?: string;
  contactInfo?: SurveyResponse['contactInfo'];
  answers: SurveyResponse['answers'];
  submittedAt?: string;
  metadata?: SurveyResponseMetadata;
}

/**
 * Create a new survey response
 * @param tenantId - The tenant ID
 * @param input - Survey response input
 */
export async function createSurveyResponse(
  tenantId: string,
  input: CreateSurveyResponseInput
): Promise<SurveyResponse> {
  console.log(
    '[DBG][surveyResponseRepository] Creating survey response for survey:',
    input.surveyId,
    'tenant:',
    tenantId
  );

  const now = new Date().toISOString();
  const responseId = generateResponseId();

  const response: SurveyResponse = {
    id: responseId,
    surveyId: input.surveyId,
    expertId: tenantId, // tenantId is expertId
    userId: input.userId,
    contactInfo: input.contactInfo,
    answers: input.answers,
    submittedAt: input.submittedAt || now,
    metadata: input.metadata,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.SURVEY_RESPONSE(input.surveyId, responseId),
    // GSI for querying by responseId alone (for direct lookup)
    GSI1PK: `RESPONSEID#${responseId}`,
    GSI1SK: 'SURVEYRESP',
    // GSI for querying by userId (cross-tenant for user's responses)
    GSI2PK: input.userId ? `USER#${input.userId}` : `ANONYMOUS#${input.surveyId}`,
    GSI2SK: `RESPONSE#${now}`,
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
 * Get a survey response by ID
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 * @param responseId - The response ID
 */
export async function getSurveyResponseById(
  tenantId: string,
  surveyId: string,
  responseId: string
): Promise<SurveyResponse | null> {
  console.log(
    '[DBG][surveyResponseRepository] Getting survey response:',
    responseId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.SURVEY_RESPONSE(surveyId, responseId),
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
 * Get a survey response by ID only (uses GSI1 for cross-tenant lookup)
 * @param responseId - The response ID
 */
export async function getSurveyResponseByIdOnly(
  responseId: string
): Promise<SurveyResponse | null> {
  console.log('[DBG][surveyResponseRepository] Getting survey response by ID only:', responseId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `RESPONSEID#${responseId}`,
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
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function getResponsesBySurvey(
  tenantId: string,
  surveyId: string
): Promise<SurveyResponse[]> {
  console.log(
    '[DBG][surveyResponseRepository] Getting responses for survey:',
    surveyId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `SURVEYRESP#${surveyId}#`,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const responses = (result.Items || []).map(mapToSurveyResponse);
  console.log('[DBG][surveyResponseRepository] Found', responses.length, 'responses');
  return responses;
}

/**
 * Get all responses for a tenant (across all their surveys)
 * @param tenantId - The tenant ID
 */
export async function getTenantResponses(tenantId: string): Promise<SurveyResponse[]> {
  console.log('[DBG][surveyResponseRepository] Getting all responses for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'SURVEYRESP#',
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const responses = (result.Items || []).map(mapToSurveyResponse);
  console.log('[DBG][surveyResponseRepository] Found', responses.length, 'responses for tenant');
  return responses;
}

/**
 * Get all responses by a user (cross-tenant via GSI2)
 * @param userId - The user ID
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
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 * @param userId - The user ID
 */
export async function hasUserResponded(
  tenantId: string,
  surveyId: string,
  userId: string
): Promise<boolean> {
  console.log('[DBG][surveyResponseRepository] Checking if user has responded:', {
    surveyId,
    userId,
    tenantId,
  });

  // Query responses for this survey and filter by userId
  const responses = await getResponsesBySurvey(tenantId, surveyId);
  const hasResponded = responses.some(r => r.userId === userId);

  console.log('[DBG][surveyResponseRepository] User has responded:', hasResponded);
  return hasResponded;
}

/**
 * Delete a survey response
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 * @param responseId - The response ID
 */
export async function deleteSurveyResponse(
  tenantId: string,
  surveyId: string,
  responseId: string
): Promise<boolean> {
  console.log(
    '[DBG][surveyResponseRepository] Deleting survey response:',
    responseId,
    'tenant:',
    tenantId
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.SURVEY_RESPONSE(surveyId, responseId),
      },
    })
  );

  console.log('[DBG][surveyResponseRepository] Survey response deleted:', responseId);
  return true;
}

/**
 * Delete all responses for a survey
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function deleteAllBySurvey(tenantId: string, surveyId: string): Promise<number> {
  console.log(
    '[DBG][surveyResponseRepository] Deleting all responses for survey:',
    surveyId,
    'tenant:',
    tenantId
  );

  const responses = await getResponsesBySurvey(tenantId, surveyId);

  if (responses.length === 0) {
    console.log('[DBG][surveyResponseRepository] No responses to delete');
    return 0;
  }

  for (const response of responses) {
    await deleteSurveyResponse(tenantId, surveyId, response.id);
  }

  console.log('[DBG][surveyResponseRepository] Deleted', responses.length, 'responses');
  return responses.length;
}

/**
 * Delete all survey responses for a user (cross-tenant)
 * Returns the count of deleted responses
 * @param userId - The user ID
 */
export async function deleteAllByUser(userId: string): Promise<number> {
  console.log('[DBG][surveyResponseRepository] Deleting all responses for user:', userId);

  const responses = await getResponsesByUser(userId);

  if (responses.length === 0) {
    console.log('[DBG][surveyResponseRepository] No responses to delete');
    return 0;
  }

  // Delete each response
  for (const response of responses) {
    await deleteSurveyResponse(response.expertId, response.surveyId, response.id);
  }

  console.log('[DBG][surveyResponseRepository] Deleted', responses.length, 'responses');
  return responses.length;
}

/**
 * Delete all responses for a tenant
 * @param tenantId - The tenant ID
 */
export async function deleteAllTenantResponses(tenantId: string): Promise<number> {
  console.log('[DBG][surveyResponseRepository] Deleting all responses for tenant:', tenantId);

  const responses = await getTenantResponses(tenantId);

  if (responses.length === 0) {
    console.log('[DBG][surveyResponseRepository] No responses to delete');
    return 0;
  }

  for (const response of responses) {
    await deleteSurveyResponse(tenantId, response.surveyId, response.id);
  }

  console.log('[DBG][surveyResponseRepository] Deleted', responses.length, 'responses');
  return responses.length;
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
    metadata: item.metadata as SurveyResponse['metadata'] | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES
// ===================================================================

/** @deprecated Use getTenantResponses(tenantId) instead */
export async function getResponsesByExpert(expertId: string): Promise<SurveyResponse[]> {
  console.warn(
    '[DBG][surveyResponseRepository] getResponsesByExpert() is deprecated - use getTenantResponses(tenantId)'
  );
  return getTenantResponses(expertId);
}
