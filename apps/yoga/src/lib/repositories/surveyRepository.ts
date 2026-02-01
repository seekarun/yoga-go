/**
 * Survey repository for DynamoDB operations
 * Handles CRUD operations for surveys
 *
 * Tenant-partitioned design:
 * - PK: TENANT#{tenantId}
 * - SK: SURVEY#{surveyId}
 *
 * Status: draft | active | closed | archived
 */

import { docClient, Tables, CorePK } from '../dynamodb';
import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import type { Survey, SurveyStatus } from '@/types';

// Helper to generate a unique survey ID
const generateSurveyId = () => `survey_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new survey (status defaults to 'draft')
 * @param tenantId - The tenant ID
 * @param input - Survey input (excluding id, createdAt, updatedAt)
 */
export async function createSurvey(
  tenantId: string,
  input: Omit<Survey, 'id' | 'expertId' | 'createdAt' | 'updatedAt' | 'status'> & {
    status?: SurveyStatus;
  }
): Promise<Survey> {
  console.log('[DBG][surveyRepository] Creating survey for tenant:', tenantId);

  const now = new Date().toISOString();
  const surveyId = generateSurveyId();
  const status = input.status || 'draft';

  const survey: Survey = {
    ...input,
    id: surveyId,
    expertId: tenantId, // tenantId is expertId
    status,
    createdAt: now,
    updatedAt: now,
  };

  const item = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.SURVEY(surveyId),
    // GSI for querying by surveyId alone (cross-tenant for public survey access)
    GSI1PK: `SURVEYID#${surveyId}`,
    GSI1SK: 'SURVEY',
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
 * Get a survey by ID
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function getSurveyById(tenantId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Getting survey:', surveyId, 'tenant:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.SURVEY(surveyId),
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
 * Get a survey by ID only (uses GSI1 for cross-tenant lookup)
 * Used for public survey access
 * @param surveyId - The survey ID
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
 * Get all surveys for a tenant (excludes archived by default)
 * @param tenantId - The tenant ID
 * @param includeArchived - Whether to include archived surveys
 */
export async function getTenantSurveys(
  tenantId: string,
  includeArchived: boolean = false
): Promise<Survey[]> {
  console.log('[DBG][surveyRepository] Getting surveys for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'SURVEY#',
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
 * Get surveys by status for a tenant
 * @param tenantId - The tenant ID
 * @param status - The survey status to filter by
 */
export async function getTenantSurveysByStatus(
  tenantId: string,
  status: SurveyStatus
): Promise<Survey[]> {
  console.log('[DBG][surveyRepository] Getting', status, 'surveys for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'SURVEY#',
        ':status': status,
      },
      ScanIndexForward: false,
    })
  );

  const surveys = (result.Items || []).map(mapToSurvey);
  console.log('[DBG][surveyRepository] Found', surveys.length, status, 'surveys');
  return surveys;
}

/**
 * Get all active surveys for a tenant
 * @param tenantId - The tenant ID
 */
export async function getActiveSurveys(tenantId: string): Promise<Survey[]> {
  return getTenantSurveysByStatus(tenantId, 'active');
}

/**
 * Get single active survey for a tenant (for backward compatibility)
 * @deprecated Use getActiveSurveys instead
 * @param tenantId - The tenant ID
 */
export async function getActiveSurvey(tenantId: string): Promise<Survey | null> {
  const surveys = await getActiveSurveys(tenantId);
  return surveys.length > 0 ? surveys[0] : null;
}

/**
 * Update a survey
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 * @param updates - Partial survey updates
 */
export async function updateSurvey(
  tenantId: string,
  surveyId: string,
  updates: Partial<
    Pick<Survey, 'title' | 'description' | 'contactInfo' | 'questions' | 'status' | 'responseCount'>
  >
): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Updating survey:', surveyId, 'tenant:', tenantId);

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
    expressionAttributeNames['#status'] = 'status';
    expressionAttributeValues[':status'] = updates.status;

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
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.SURVEY(surveyId),
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
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function publishSurvey(tenantId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Publishing survey:', surveyId);
  return updateSurvey(tenantId, surveyId, { status: 'active' });
}

/**
 * Close a survey (active -> closed)
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function closeSurvey(tenantId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Closing survey:', surveyId);
  return updateSurvey(tenantId, surveyId, { status: 'closed' });
}

/**
 * Reopen a survey (closed -> active)
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function reopenSurvey(tenantId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Reopening survey:', surveyId);
  return updateSurvey(tenantId, surveyId, { status: 'active' });
}

/**
 * Archive a survey (soft delete)
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function archiveSurvey(tenantId: string, surveyId: string): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Archiving survey:', surveyId);
  return updateSurvey(tenantId, surveyId, { status: 'archived' });
}

/**
 * Increment response count for a survey
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function incrementResponseCount(
  tenantId: string,
  surveyId: string
): Promise<Survey | null> {
  console.log('[DBG][surveyRepository] Incrementing response count for survey:', surveyId);

  const now = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.SURVEY(surveyId),
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
 * @param tenantId - The tenant ID
 * @param surveyId - The survey ID
 */
export async function deleteSurvey(tenantId: string, surveyId: string): Promise<boolean> {
  console.log('[DBG][surveyRepository] Deleting survey:', surveyId, 'tenant:', tenantId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.SURVEY(surveyId),
      },
    })
  );

  console.log('[DBG][surveyRepository] Survey deleted:', surveyId);
  return true;
}

/**
 * Delete all surveys for a tenant
 * @param tenantId - The tenant ID
 */
export async function deleteAllTenantSurveys(tenantId: string): Promise<number> {
  console.log('[DBG][surveyRepository] Deleting all surveys for tenant:', tenantId);

  const surveys = await getTenantSurveys(tenantId, true); // Include archived

  if (surveys.length === 0) {
    console.log('[DBG][surveyRepository] No surveys to delete');
    return 0;
  }

  for (const survey of surveys) {
    await deleteSurvey(tenantId, survey.id);
  }

  console.log('[DBG][surveyRepository] Deleted', surveys.length, 'surveys');
  return surveys.length;
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

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES
// ===================================================================

/** @deprecated Use getTenantSurveys(tenantId) instead */
export async function getSurveysByExpert(
  expertId: string,
  includeArchived: boolean = false
): Promise<Survey[]> {
  console.warn(
    '[DBG][surveyRepository] getSurveysByExpert() is deprecated - use getTenantSurveys(tenantId)'
  );
  return getTenantSurveys(expertId, includeArchived);
}

/** @deprecated Use getTenantSurveysByStatus(tenantId, status) instead */
export async function getSurveysByExpertByStatus(
  expertId: string,
  status: SurveyStatus
): Promise<Survey[]> {
  console.warn(
    '[DBG][surveyRepository] getSurveysByExpertByStatus() is deprecated - use getTenantSurveysByStatus(tenantId, status)'
  );
  return getTenantSurveysByStatus(expertId, status);
}

/** @deprecated Use getActiveSurveys(tenantId) instead */
export async function getActiveSurveysByExpert(expertId: string): Promise<Survey[]> {
  console.warn(
    '[DBG][surveyRepository] getActiveSurveysByExpert() is deprecated - use getActiveSurveys(tenantId)'
  );
  return getActiveSurveys(expertId);
}

/** @deprecated Use getActiveSurvey(tenantId) instead */
export async function getActiveSurveyByExpert(expertId: string): Promise<Survey | null> {
  console.warn(
    '[DBG][surveyRepository] getActiveSurveyByExpert() is deprecated - use getActiveSurvey(tenantId)'
  );
  return getActiveSurvey(expertId);
}
