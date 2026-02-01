/**
 * Webinar Repository - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "WEBINAR#{webinarId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import type {
  Webinar,
  WebinarSession,
  WebinarFeedback,
  WebinarStatus,
  CourseCategory,
  CourseLevel,
  SupportedCurrency,
  VideoPlatform,
} from '@/types';

// Type for DynamoDB Webinar item (includes PK/SK and GSI)
interface DynamoDBWebinarItem extends Webinar {
  PK: string;
  SK: string;
  GSI1PK?: string; // WEBINARID#{webinarId} for cross-tenant lookup
  GSI1SK?: string;
}

// Type for creating a new webinar
export interface CreateWebinarInput {
  id: string;
  expertId: string;
  title: string;
  description: string;
  thumbnail?: string;
  coverImage?: string;
  promoVideoCloudflareId?: string;
  promoVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  price: number;
  currency: SupportedCurrency; // Currency for the webinar price (expert's preferred currency)
  maxParticipants?: number;
  status?: WebinarStatus;
  videoPlatform?: VideoPlatform;
  sessions?: WebinarSession[];
  tags?: string[];
  category?: CourseCategory;
  level?: CourseLevel;
  requirements?: string[];
  whatYouWillLearn?: string[];
  isOpen?: boolean; // If true, any logged-in user can join without registration
}

/**
 * Convert DynamoDB item to Webinar type (removes PK/SK/GSI)
 */
function toWebinar(item: DynamoDBWebinarItem): Webinar {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, ...webinar } = item;
  return webinar as Webinar;
}

/**
 * Get webinar by ID
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 */
export async function getWebinarById(tenantId: string, webinarId: string): Promise<Webinar | null> {
  console.log(
    '[DBG][webinarRepository] Getting webinar by id:',
    webinarId,
    'for tenant:',
    tenantId
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.WEBINAR(webinarId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][webinarRepository] Webinar not found');
    return null;
  }

  console.log('[DBG][webinarRepository] Found webinar:', webinarId);
  return toWebinar(result.Item as DynamoDBWebinarItem);
}

/**
 * Get webinar by ID only (cross-tenant lookup using GSI1)
 * Used for public access when tenantId is not known
 * @param webinarId - The webinar ID
 */
export async function getWebinarByIdOnly(webinarId: string): Promise<Webinar | null> {
  console.log('[DBG][webinarRepository] Getting webinar by ID only (cross-tenant):', webinarId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `WEBINARID#${webinarId}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][webinarRepository] Webinar not found (cross-tenant):', webinarId);
    return null;
  }

  console.log('[DBG][webinarRepository] Found webinar (cross-tenant):', webinarId);
  return toWebinar(result.Items[0] as DynamoDBWebinarItem);
}

/**
 * Get all webinars for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getTenantWebinars(tenantId: string): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting all webinars for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'WEBINAR#',
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'webinars');
  return webinars;
}

/**
 * Get published/scheduled webinars for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getPublishedTenantWebinars(tenantId: string): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting published webinars for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#status IN (:scheduled, :live)',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'WEBINAR#',
        ':scheduled': 'SCHEDULED',
        ':live': 'LIVE',
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'published webinars');
  return webinars;
}

/**
 * Get webinars by status for a tenant
 * @param tenantId - The tenant ID (expertId)
 * @param status - Webinar status to filter by
 */
export async function getTenantWebinarsByStatus(
  tenantId: string,
  status: WebinarStatus
): Promise<Webinar[]> {
  console.log(
    '[DBG][webinarRepository] Getting webinars by status:',
    status,
    'for tenant:',
    tenantId
  );

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
        ':skPrefix': 'WEBINAR#',
        ':status': status,
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'webinars with status', status);
  return webinars;
}

/**
 * Get upcoming webinars for a tenant (SCHEDULED status, sorted by first session start time)
 * @param tenantId - The tenant ID (expertId)
 */
export async function getUpcomingTenantWebinars(tenantId: string): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting upcoming webinars for tenant:', tenantId);

  const webinars = await getTenantWebinarsByStatus(tenantId, 'SCHEDULED');

  // Sort by first session start time
  const now = new Date().toISOString();
  const sortedWebinars = webinars
    .filter(w => {
      const firstSession = w.sessions?.[0];
      return firstSession && firstSession.startTime >= now;
    })
    .sort((a, b) => {
      const aTime = a.sessions?.[0]?.startTime || '';
      const bTime = b.sessions?.[0]?.startTime || '';
      return aTime.localeCompare(bTime);
    });

  console.log('[DBG][webinarRepository] Found', sortedWebinars.length, 'upcoming webinars');
  return sortedWebinars;
}

/**
 * Create a new webinar
 * @param tenantId - The tenant ID (expertId)
 * @param input - Webinar creation input
 */
export async function createWebinar(tenantId: string, input: CreateWebinarInput): Promise<Webinar> {
  const now = new Date().toISOString();

  console.log('[DBG][webinarRepository] Creating webinar:', input.id, 'for tenant:', tenantId);

  const webinar: DynamoDBWebinarItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.WEBINAR(input.id),
    // GSI1 for cross-tenant lookup by webinarId
    GSI1PK: `WEBINARID#${input.id}`,
    GSI1SK: 'WEBINAR',
    id: input.id,
    expertId: input.expertId,
    title: input.title,
    description: input.description,
    thumbnail: input.thumbnail,
    coverImage: input.coverImage,
    promoVideoCloudflareId: input.promoVideoCloudflareId,
    promoVideoStatus: input.promoVideoStatus,
    price: input.price,
    currency: input.currency,
    maxParticipants: input.maxParticipants,
    status: input.status || 'DRAFT',
    videoPlatform: input.videoPlatform || 'none',
    sessions: input.sessions || [],
    totalRegistrations: 0,
    rating: 0,
    totalRatings: 0,
    tags: input.tags || [],
    category: input.category,
    level: input.level,
    requirements: input.requirements || [],
    whatYouWillLearn: input.whatYouWillLearn || [],
    feedback: [],
    isOpen: input.isOpen,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: webinar,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    })
  );

  console.log('[DBG][webinarRepository] Created webinar:', input.id);
  return toWebinar(webinar);
}

/**
 * Update webinar - partial update using UpdateCommand
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 * @param updates - Partial webinar updates
 */
export async function updateWebinar(
  tenantId: string,
  webinarId: string,
  updates: Partial<Webinar>
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Updating webinar:', webinarId, 'for tenant:', tenantId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'PK' && key !== 'SK') {
      updateParts.push(`#k${index} = :v${index}`);
      exprAttrNames[`#k${index}`] = key;
      exprAttrValues[`:v${index}`] = value;
      index++;
    }
  }

  // Always update updatedAt
  updateParts.push('#updatedAt = :updatedAt');
  exprAttrNames['#updatedAt'] = 'updatedAt';
  exprAttrValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.WEBINAR(webinarId),
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][webinarRepository] Updated webinar:', webinarId);
  return toWebinar(result.Attributes as DynamoDBWebinarItem);
}

/**
 * Delete webinar
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 */
export async function deleteWebinar(tenantId: string, webinarId: string): Promise<void> {
  console.log('[DBG][webinarRepository] Deleting webinar:', webinarId, 'for tenant:', tenantId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.WEBINAR(webinarId),
      },
    })
  );

  console.log('[DBG][webinarRepository] Deleted webinar:', webinarId);
}

/**
 * Update webinar status
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 * @param status - New status
 */
export async function updateWebinarStatus(
  tenantId: string,
  webinarId: string,
  status: WebinarStatus
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Updating webinar status:', webinarId, status);
  return updateWebinar(tenantId, webinarId, { status });
}

/**
 * Add a session to a webinar
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 * @param session - Session to add
 */
export async function addSession(
  tenantId: string,
  webinarId: string,
  session: WebinarSession
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Adding session to webinar:', webinarId);

  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const sessions = [...(webinar.sessions || []), session];
  return updateWebinar(tenantId, webinarId, { sessions });
}

/**
 * Update a session in a webinar
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 * @param sessionId - Session ID to update
 * @param updates - Partial session updates
 */
export async function updateSession(
  tenantId: string,
  webinarId: string,
  sessionId: string,
  updates: Partial<WebinarSession>
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Updating session:', sessionId, 'in webinar:', webinarId);

  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const sessions = (webinar.sessions || []).map(s => {
    if (s.id === sessionId) {
      return { ...s, ...updates };
    }
    return s;
  });

  return updateWebinar(tenantId, webinarId, { sessions });
}

/**
 * Delete a session from a webinar
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 * @param sessionId - Session ID to delete
 */
export async function deleteSession(
  tenantId: string,
  webinarId: string,
  sessionId: string
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Deleting session:', sessionId, 'from webinar:', webinarId);

  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const sessions = (webinar.sessions || []).filter(s => s.id !== sessionId);
  return updateWebinar(tenantId, webinarId, { sessions });
}

/**
 * Add feedback to a webinar
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 * @param feedback - Feedback to add
 */
export async function addFeedback(
  tenantId: string,
  webinarId: string,
  feedback: WebinarFeedback
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Adding feedback to webinar:', webinarId);

  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const feedbackList = [...(webinar.feedback || []), feedback];

  // Calculate new average rating
  const totalRatings = feedbackList.length;
  const averageRating = feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalRatings;

  return updateWebinar(tenantId, webinarId, {
    feedback: feedbackList,
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings,
  });
}

/**
 * Increment total registrations
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 */
export async function incrementRegistrations(
  tenantId: string,
  webinarId: string
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Incrementing registrations for webinar:', webinarId);

  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  return updateWebinar(tenantId, webinarId, {
    totalRegistrations: (webinar.totalRegistrations || 0) + 1,
  });
}

/**
 * Decrement total registrations (for cancellations)
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 */
export async function decrementRegistrations(
  tenantId: string,
  webinarId: string
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Decrementing registrations for webinar:', webinarId);

  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const newCount = Math.max(0, (webinar.totalRegistrations || 0) - 1);
  return updateWebinar(tenantId, webinarId, { totalRegistrations: newCount });
}

/**
 * Check if webinar has capacity available
 * @param tenantId - The tenant ID (expertId)
 * @param webinarId - The webinar ID
 */
export async function hasCapacity(tenantId: string, webinarId: string): Promise<boolean> {
  const webinar = await getWebinarById(tenantId, webinarId);
  if (!webinar) {
    return false;
  }

  // If no max participants set, unlimited capacity
  if (!webinar.maxParticipants) {
    return true;
  }

  return (webinar.totalRegistrations || 0) < webinar.maxParticipants;
}

/**
 * Get webinars with sessions starting within a time range (for reminders)
 * @param tenantId - The tenant ID (expertId)
 * @param startFrom - Start time range
 * @param startTo - End time range
 */
export async function getWebinarsWithSessionsInRange(
  tenantId: string,
  startFrom: string,
  startTo: string
): Promise<Webinar[]> {
  console.log(
    '[DBG][webinarRepository] Getting webinars with sessions between:',
    startFrom,
    'and',
    startTo
  );

  // Get all scheduled webinars and filter by session times
  const webinars = await getTenantWebinarsByStatus(tenantId, 'SCHEDULED');

  const matchingWebinars = webinars.filter(w => {
    return w.sessions?.some(s => s.startTime >= startFrom && s.startTime <= startTo);
  });

  console.log(
    '[DBG][webinarRepository] Found',
    matchingWebinars.length,
    'webinars with sessions in range'
  );
  return matchingWebinars;
}

/**
 * Count webinars for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function countTenantWebinars(tenantId: string): Promise<number> {
  const webinars = await getTenantWebinars(tenantId);
  return webinars.length;
}

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES
// ===================================================================

/** @deprecated Use getTenantWebinars(tenantId) instead */
export async function getAllWebinars(): Promise<Webinar[]> {
  console.warn(
    '[DBG][webinarRepository] getAllWebinars() is deprecated - use getTenantWebinars(tenantId)'
  );
  return [];
}

/** @deprecated Use getTenantWebinars(tenantId) instead */
export async function getWebinarsByExpertId(expertId: string): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] getWebinarsByExpertId - using as getTenantWebinars');
  return getTenantWebinars(expertId);
}

/** @deprecated Use getPublishedTenantWebinars(tenantId) instead */
export async function getPublishedWebinarsByExpertId(expertId: string): Promise<Webinar[]> {
  console.log(
    '[DBG][webinarRepository] getPublishedWebinarsByExpertId - using as getPublishedTenantWebinars'
  );
  return getPublishedTenantWebinars(expertId);
}

/** @deprecated Use getTenantWebinarsByStatus(tenantId, status) instead */
export async function getWebinarsByStatus(status: WebinarStatus): Promise<Webinar[]> {
  console.warn(
    '[DBG][webinarRepository] getWebinarsByStatus() is deprecated - use getTenantWebinarsByStatus(tenantId, status)'
  );
  return [];
}

/** @deprecated Use getUpcomingTenantWebinars(tenantId) instead */
export async function getUpcomingWebinars(): Promise<Webinar[]> {
  console.warn(
    '[DBG][webinarRepository] getUpcomingWebinars() is deprecated - use getUpcomingTenantWebinars(tenantId)'
  );
  return [];
}

/** @deprecated Use countTenantWebinars(tenantId) instead */
export async function countWebinarsByExpertId(expertId: string): Promise<number> {
  return countTenantWebinars(expertId);
}
