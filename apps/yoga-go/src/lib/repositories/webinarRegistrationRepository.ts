/**
 * Webinar Registration Repository - DynamoDB Operations
 *
 * Tenant-partitioned design with dual-write for efficient lookups:
 * - By tenant/webinar: PK=TENANT#{tenantId}, SK=WEBREG#{webinarId}#{registrationId}
 * - By user (cross-tenant): PK=USERREG#{userId}, SK={registrationId}
 */

import { GetCommand, UpdateCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import type { WebinarRegistration, WebinarRegistrationStatus, WebinarRemindersSent } from '@/types';

// Type for DynamoDB Registration item (includes PK/SK)
interface DynamoDBRegistrationItem extends WebinarRegistration {
  PK: string;
  SK: string;
}

// Type for creating a new registration
export interface CreateRegistrationInput {
  id: string;
  webinarId: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  paymentId?: string;
}

/**
 * Convert DynamoDB item to WebinarRegistration type (removes PK/SK)
 */
function toRegistration(item: DynamoDBRegistrationItem): WebinarRegistration {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...registration } = item;
  return registration as WebinarRegistration;
}

/**
 * Get registration by tenantId, webinarId and user
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 */
export async function getRegistration(
  tenantId: string,
  webinarId: string,
  userId: string
): Promise<WebinarRegistration | null> {
  console.log(
    '[DBG][webinarRegistrationRepo] Getting registration for webinar:',
    webinarId,
    'user:',
    userId,
    'tenant:',
    tenantId
  );

  // Query by tenant PK and filter by webinarId and userId
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `WEBREG#${webinarId}#`,
        ':userId': userId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][webinarRegistrationRepo] Registration not found');
    return null;
  }

  console.log('[DBG][webinarRegistrationRepo] Found registration');
  return toRegistration(result.Items[0] as DynamoDBRegistrationItem);
}

/**
 * Get registration by ID
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param registrationId - The registration ID
 */
export async function getRegistrationById(
  tenantId: string,
  webinarId: string,
  registrationId: string
): Promise<WebinarRegistration | null> {
  console.log('[DBG][webinarRegistrationRepo] Getting registration by id:', registrationId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.WEBINAR_REGISTRATION_SK(webinarId, registrationId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][webinarRegistrationRepo] Registration not found');
    return null;
  }

  console.log('[DBG][webinarRegistrationRepo] Found registration:', registrationId);
  return toRegistration(result.Item as DynamoDBRegistrationItem);
}

/**
 * Get all registrations for a webinar
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 */
export async function getRegistrationsByWebinarId(
  tenantId: string,
  webinarId: string
): Promise<WebinarRegistration[]> {
  console.log(
    '[DBG][webinarRegistrationRepo] Getting registrations for webinar:',
    webinarId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `WEBREG#${webinarId}#`,
      },
    })
  );

  const registrations = (result.Items || []).map(item =>
    toRegistration(item as DynamoDBRegistrationItem)
  );
  console.log('[DBG][webinarRegistrationRepo] Found', registrations.length, 'registrations');
  return registrations;
}

/**
 * Get all registrations for a user (cross-tenant view)
 * @param userId - The user ID
 */
export async function getRegistrationsByUserId(userId: string): Promise<WebinarRegistration[]> {
  console.log('[DBG][webinarRegistrationRepo] Getting registrations for user:', userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CorePK.USER_REGISTRATIONS(userId),
      },
    })
  );

  const registrations = (result.Items || []).map(item =>
    toRegistration(item as DynamoDBRegistrationItem)
  );
  console.log('[DBG][webinarRegistrationRepo] Found', registrations.length, 'user registrations');
  return registrations;
}

/**
 * Get registrations by status (for a webinar)
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param status - The registration status
 */
export async function getRegistrationsByStatus(
  tenantId: string,
  webinarId: string,
  status: WebinarRegistrationStatus
): Promise<WebinarRegistration[]> {
  console.log(
    '[DBG][webinarRegistrationRepo] Getting registrations by status:',
    status,
    'for webinar:',
    webinarId,
    'tenant:',
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
        ':skPrefix': `WEBREG#${webinarId}#`,
        ':status': status,
      },
    })
  );

  const registrations = (result.Items || []).map(item =>
    toRegistration(item as DynamoDBRegistrationItem)
  );
  console.log('[DBG][webinarRegistrationRepo] Found', registrations.length, 'registrations');
  return registrations;
}

/**
 * Get active registrations (registered status only)
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 */
export async function getActiveRegistrations(
  tenantId: string,
  webinarId: string
): Promise<WebinarRegistration[]> {
  return getRegistrationsByStatus(tenantId, webinarId, 'registered');
}

/**
 * Create a new registration (dual-write)
 * @param tenantId - The tenant ID
 * @param input - Registration input
 */
export async function createRegistration(
  tenantId: string,
  input: CreateRegistrationInput
): Promise<WebinarRegistration> {
  const now = new Date().toISOString();

  console.log(
    '[DBG][webinarRegistrationRepo] Creating registration for webinar:',
    input.webinarId,
    'user:',
    input.userId,
    'tenant:',
    tenantId
  );

  const registration: WebinarRegistration = {
    id: input.id,
    webinarId: input.webinarId,
    userId: input.userId,
    expertId: tenantId, // tenantId is the expertId
    userName: input.userName,
    userEmail: input.userEmail,
    registeredAt: now,
    paymentId: input.paymentId,
    status: 'registered',
    remindersSent: {
      dayBefore: false,
      hourBefore: false,
    },
    feedbackSubmitted: false,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: one for tenant/webinar lookup, one for user lookup
  const tenantItem: DynamoDBRegistrationItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.WEBINAR_REGISTRATION_SK(input.webinarId, input.id),
    ...registration,
  };

  const userItem: DynamoDBRegistrationItem = {
    PK: CorePK.USER_REGISTRATIONS(input.userId),
    SK: input.id,
    ...registration,
  };

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CORE]: [{ PutRequest: { Item: tenantItem } }, { PutRequest: { Item: userItem } }],
      },
    })
  );

  console.log('[DBG][webinarRegistrationRepo] Created registration:', input.id);
  return registration;
}

/**
 * Update registration (dual-write)
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 * @param registrationId - The registration ID
 * @param updates - Partial updates
 */
export async function updateRegistration(
  tenantId: string,
  webinarId: string,
  userId: string,
  registrationId: string,
  updates: Partial<WebinarRegistration>
): Promise<WebinarRegistration> {
  console.log('[DBG][webinarRegistrationRepo] Updating registration:', registrationId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (
      value !== undefined &&
      key !== 'id' &&
      key !== 'PK' &&
      key !== 'SK' &&
      key !== 'webinarId' &&
      key !== 'userId'
    ) {
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

  const updateExpression = `SET ${updateParts.join(', ')}`;

  // Update both records (dual-write)
  const [tenantResult] = await Promise.all([
    docClient.send(
      new UpdateCommand({
        TableName: Tables.CORE,
        Key: {
          PK: CorePK.TENANT(tenantId),
          SK: CorePK.WEBINAR_REGISTRATION_SK(webinarId, registrationId),
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
        ReturnValues: 'ALL_NEW',
      })
    ),
    docClient.send(
      new UpdateCommand({
        TableName: Tables.CORE,
        Key: {
          PK: CorePK.USER_REGISTRATIONS(userId),
          SK: registrationId,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
      })
    ),
  ]);

  console.log('[DBG][webinarRegistrationRepo] Updated registration:', registrationId);
  return toRegistration(tenantResult.Attributes as DynamoDBRegistrationItem);
}

/**
 * Delete registration (dual-write)
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 * @param registrationId - The registration ID
 */
export async function deleteRegistration(
  tenantId: string,
  webinarId: string,
  userId: string,
  registrationId: string
): Promise<void> {
  console.log('[DBG][webinarRegistrationRepo] Deleting registration:', registrationId);

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.CORE]: [
          {
            DeleteRequest: {
              Key: {
                PK: CorePK.TENANT(tenantId),
                SK: CorePK.WEBINAR_REGISTRATION_SK(webinarId, registrationId),
              },
            },
          },
          {
            DeleteRequest: {
              Key: {
                PK: CorePK.USER_REGISTRATIONS(userId),
                SK: registrationId,
              },
            },
          },
        ],
      },
    })
  );

  console.log('[DBG][webinarRegistrationRepo] Deleted registration:', registrationId);
}

/**
 * Update registration status
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 * @param registrationId - The registration ID
 * @param status - The new status
 */
export async function updateRegistrationStatus(
  tenantId: string,
  webinarId: string,
  userId: string,
  registrationId: string,
  status: WebinarRegistrationStatus
): Promise<WebinarRegistration> {
  console.log(
    '[DBG][webinarRegistrationRepo] Updating registration status:',
    registrationId,
    status
  );
  return updateRegistration(tenantId, webinarId, userId, registrationId, { status });
}

/**
 * Mark reminder as sent
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 * @param registrationId - The registration ID
 * @param reminderType - The reminder type
 */
export async function markReminderSent(
  tenantId: string,
  webinarId: string,
  userId: string,
  registrationId: string,
  reminderType: 'dayBefore' | 'hourBefore'
): Promise<WebinarRegistration> {
  console.log(
    '[DBG][webinarRegistrationRepo] Marking reminder sent:',
    reminderType,
    'for registration:',
    registrationId
  );

  // Get current reminders sent state
  const registration = await getRegistrationById(tenantId, webinarId, registrationId);
  if (!registration) {
    throw new Error('Registration not found');
  }

  const remindersSent: WebinarRemindersSent = {
    ...registration.remindersSent,
    [reminderType]: true,
  };

  return updateRegistration(tenantId, webinarId, userId, registrationId, { remindersSent });
}

/**
 * Mark feedback as submitted
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 * @param registrationId - The registration ID
 */
export async function markFeedbackSubmitted(
  tenantId: string,
  webinarId: string,
  userId: string,
  registrationId: string
): Promise<WebinarRegistration> {
  console.log('[DBG][webinarRegistrationRepo] Marking feedback submitted:', registrationId);
  return updateRegistration(tenantId, webinarId, userId, registrationId, {
    feedbackSubmitted: true,
  });
}

/**
 * Mark session as attended
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 * @param registrationId - The registration ID
 * @param sessionId - The session ID
 */
export async function markSessionAttended(
  tenantId: string,
  webinarId: string,
  userId: string,
  registrationId: string,
  sessionId: string
): Promise<WebinarRegistration> {
  console.log(
    '[DBG][webinarRegistrationRepo] Marking session attended:',
    sessionId,
    'for registration:',
    registrationId
  );

  const registration = await getRegistrationById(tenantId, webinarId, registrationId);
  if (!registration) {
    throw new Error('Registration not found');
  }

  const attendedSessions = [...(registration.attendedSessions || [])];
  if (!attendedSessions.includes(sessionId)) {
    attendedSessions.push(sessionId);
  }

  return updateRegistration(tenantId, webinarId, userId, registrationId, {
    attendedSessions,
    status: 'attended',
  });
}

/**
 * Check if user is registered for a webinar
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param userId - The user ID
 */
export async function isUserRegistered(
  tenantId: string,
  webinarId: string,
  userId: string
): Promise<boolean> {
  const registration = await getRegistration(tenantId, webinarId, userId);
  return registration !== null && registration.status === 'registered';
}

/**
 * Count active registrations for a webinar
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 */
export async function countActiveRegistrations(
  tenantId: string,
  webinarId: string
): Promise<number> {
  const registrations = await getActiveRegistrations(tenantId, webinarId);
  return registrations.length;
}

/**
 * Get registrations that need reminders
 * Returns registrations where the reminder hasn't been sent yet
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 * @param reminderType - The reminder type
 */
export async function getRegistrationsNeedingReminder(
  tenantId: string,
  webinarId: string,
  reminderType: 'dayBefore' | 'hourBefore'
): Promise<WebinarRegistration[]> {
  console.log(
    '[DBG][webinarRegistrationRepo] Getting registrations needing',
    reminderType,
    'reminder for webinar:',
    webinarId,
    'tenant:',
    tenantId
  );

  const registrations = await getActiveRegistrations(tenantId, webinarId);

  const needingReminder = registrations.filter(r => {
    return !r.remindersSent?.[reminderType];
  });

  console.log(
    '[DBG][webinarRegistrationRepo] Found',
    needingReminder.length,
    'registrations needing reminder'
  );
  return needingReminder;
}

/**
 * Delete all registrations for a user (cross-tenant)
 * Returns the count of deleted registrations
 * @param userId - The user ID
 */
export async function deleteAllByUser(userId: string): Promise<number> {
  console.log('[DBG][webinarRegistrationRepo] Deleting all registrations for user:', userId);

  const registrations = await getRegistrationsByUserId(userId);

  if (registrations.length === 0) {
    console.log('[DBG][webinarRegistrationRepo] No registrations to delete');
    return 0;
  }

  // Delete each registration (handles dual-write cleanup)
  for (const registration of registrations) {
    await deleteRegistration(
      registration.expertId, // expertId is tenantId
      registration.webinarId,
      userId,
      registration.id
    );
  }

  console.log('[DBG][webinarRegistrationRepo] Deleted', registrations.length, 'registrations');
  return registrations.length;
}

/**
 * Delete all registrations for a webinar (for webinar deletion)
 * @param tenantId - The tenant ID
 * @param webinarId - The webinar ID
 */
export async function deleteAllByWebinar(tenantId: string, webinarId: string): Promise<number> {
  console.log(
    '[DBG][webinarRegistrationRepo] Deleting all registrations for webinar:',
    webinarId,
    'tenant:',
    tenantId
  );

  const registrations = await getRegistrationsByWebinarId(tenantId, webinarId);

  if (registrations.length === 0) {
    console.log('[DBG][webinarRegistrationRepo] No registrations to delete');
    return 0;
  }

  for (const registration of registrations) {
    await deleteRegistration(tenantId, webinarId, registration.userId, registration.id);
  }

  console.log('[DBG][webinarRegistrationRepo] Deleted', registrations.length, 'registrations');
  return registrations.length;
}
