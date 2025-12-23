/**
 * Webinar Repository - DynamoDB Operations
 *
 * Single-table design:
 * - PK: "WEBINAR"
 * - SK: webinarId
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType } from '../dynamodb';
import type {
  Webinar,
  WebinarSession,
  WebinarFeedback,
  WebinarStatus,
  CourseCategory,
  CourseLevel,
  SupportedCurrency,
} from '@/types';

// Type for DynamoDB Webinar item (includes PK/SK)
interface DynamoDBWebinarItem extends Webinar {
  PK: string;
  SK: string;
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
  videoPlatform?: 'google_meet' | 'zoom' | 'none';
  sessions?: WebinarSession[];
  tags?: string[];
  category?: CourseCategory;
  level?: CourseLevel;
  requirements?: string[];
  whatYouWillLearn?: string[];
}

/**
 * Convert DynamoDB item to Webinar type (removes PK/SK)
 */
function toWebinar(item: DynamoDBWebinarItem): Webinar {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...webinar } = item;
  return webinar as Webinar;
}

/**
 * Get webinar by ID
 */
export async function getWebinarById(webinarId: string): Promise<Webinar | null> {
  console.log('[DBG][webinarRepository] Getting webinar by id:', webinarId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.WEBINAR,
        SK: webinarId,
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
 * Get all webinars
 */
export async function getAllWebinars(): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting all webinars');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EntityType.WEBINAR,
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'webinars');
  return webinars;
}

/**
 * Get webinars by expert ID
 */
export async function getWebinarsByExpertId(expertId: string): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting webinars by expertId:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'expertId = :expertId',
      ExpressionAttributeValues: {
        ':pk': EntityType.WEBINAR,
        ':expertId': expertId,
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'webinars for expert');
  return webinars;
}

/**
 * Get published/scheduled webinars by expert ID
 */
export async function getPublishedWebinarsByExpertId(expertId: string): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting published webinars by expertId:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'expertId = :expertId AND #status IN (:scheduled, :live)',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.WEBINAR,
        ':expertId': expertId,
        ':scheduled': 'SCHEDULED',
        ':live': 'LIVE',
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'published webinars for expert');
  return webinars;
}

/**
 * Get webinars by status
 */
export async function getWebinarsByStatus(status: WebinarStatus): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting webinars by status:', status);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.WEBINAR,
        ':status': status,
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));
  console.log('[DBG][webinarRepository] Found', webinars.length, 'webinars with status', status);
  return webinars;
}

/**
 * Get upcoming webinars (SCHEDULED status, sorted by first session start time)
 */
export async function getUpcomingWebinars(): Promise<Webinar[]> {
  console.log('[DBG][webinarRepository] Getting upcoming webinars');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: '#status = :scheduled',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.WEBINAR,
        ':scheduled': 'SCHEDULED',
      },
    })
  );

  const webinars = (result.Items || []).map(item => toWebinar(item as DynamoDBWebinarItem));

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
 */
export async function createWebinar(input: CreateWebinarInput): Promise<Webinar> {
  const now = new Date().toISOString();

  console.log('[DBG][webinarRepository] Creating webinar:', input.id, 'title:', input.title);

  const webinar: DynamoDBWebinarItem = {
    PK: EntityType.WEBINAR,
    SK: input.id,
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
 */
export async function updateWebinar(
  webinarId: string,
  updates: Partial<Webinar>
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Updating webinar:', webinarId);

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
        PK: EntityType.WEBINAR,
        SK: webinarId,
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
 */
export async function deleteWebinar(webinarId: string): Promise<void> {
  console.log('[DBG][webinarRepository] Deleting webinar:', webinarId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.WEBINAR,
        SK: webinarId,
      },
    })
  );

  console.log('[DBG][webinarRepository] Deleted webinar:', webinarId);
}

/**
 * Update webinar status
 */
export async function updateWebinarStatus(
  webinarId: string,
  status: WebinarStatus
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Updating webinar status:', webinarId, status);
  return updateWebinar(webinarId, { status });
}

/**
 * Add a session to a webinar
 */
export async function addSession(webinarId: string, session: WebinarSession): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Adding session to webinar:', webinarId);

  const webinar = await getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const sessions = [...(webinar.sessions || []), session];
  return updateWebinar(webinarId, { sessions });
}

/**
 * Update a session in a webinar
 */
export async function updateSession(
  webinarId: string,
  sessionId: string,
  updates: Partial<WebinarSession>
): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Updating session:', sessionId, 'in webinar:', webinarId);

  const webinar = await getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const sessions = (webinar.sessions || []).map(s => {
    if (s.id === sessionId) {
      return { ...s, ...updates };
    }
    return s;
  });

  return updateWebinar(webinarId, { sessions });
}

/**
 * Delete a session from a webinar
 */
export async function deleteSession(webinarId: string, sessionId: string): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Deleting session:', sessionId, 'from webinar:', webinarId);

  const webinar = await getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const sessions = (webinar.sessions || []).filter(s => s.id !== sessionId);
  return updateWebinar(webinarId, { sessions });
}

/**
 * Add feedback to a webinar
 */
export async function addFeedback(webinarId: string, feedback: WebinarFeedback): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Adding feedback to webinar:', webinarId);

  const webinar = await getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const feedbackList = [...(webinar.feedback || []), feedback];

  // Calculate new average rating
  const totalRatings = feedbackList.length;
  const averageRating = feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalRatings;

  return updateWebinar(webinarId, {
    feedback: feedbackList,
    rating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
    totalRatings,
  });
}

/**
 * Increment total registrations
 */
export async function incrementRegistrations(webinarId: string): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Incrementing registrations for webinar:', webinarId);

  const webinar = await getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  return updateWebinar(webinarId, { totalRegistrations: (webinar.totalRegistrations || 0) + 1 });
}

/**
 * Decrement total registrations (for cancellations)
 */
export async function decrementRegistrations(webinarId: string): Promise<Webinar> {
  console.log('[DBG][webinarRepository] Decrementing registrations for webinar:', webinarId);

  const webinar = await getWebinarById(webinarId);
  if (!webinar) {
    throw new Error('Webinar not found');
  }

  const newCount = Math.max(0, (webinar.totalRegistrations || 0) - 1);
  return updateWebinar(webinarId, { totalRegistrations: newCount });
}

/**
 * Check if webinar has capacity available
 */
export async function hasCapacity(webinarId: string): Promise<boolean> {
  const webinar = await getWebinarById(webinarId);
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
 */
export async function getWebinarsWithSessionsInRange(
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
  const webinars = await getWebinarsByStatus('SCHEDULED');

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
 * Count webinars by expert ID
 */
export async function countWebinarsByExpertId(expertId: string): Promise<number> {
  const webinars = await getWebinarsByExpertId(expertId);
  return webinars.length;
}
