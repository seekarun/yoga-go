/**
 * ExpertAvailability repository for DynamoDB operations
 * Handles CRUD operations for expert availability slots
 *
 * 4-Table Design - CALENDAR table:
 * - Expert's availability: PK=AVAIL#{expertId}, SK={availabilityId}
 */

import { docClient, Tables, CalendarPK, EntityType } from '../dynamodb';
import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { ExpertAvailability } from '@/types';

// Helper to generate a unique availability ID
const generateAvailabilityId = () =>
  `avail_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new availability slot
 */
export async function createAvailability(
  input: Omit<ExpertAvailability, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ExpertAvailability> {
  console.log('[DBG][availabilityRepository] Creating availability for expert:', input.expertId);

  const now = new Date().toISOString();
  const availabilityId = generateAvailabilityId();

  const availability: ExpertAvailability = {
    ...input,
    id: availabilityId,
    isActive: input.isActive ?? true,
    createdAt: now,
    updatedAt: now,
  };

  // SK includes type prefix for filtering recurring vs date-specific
  const skPrefix = input.isRecurring
    ? `RECURRING#${input.dayOfWeek}#${input.startTime}#${availabilityId}`
    : `DATE#${input.date}#${input.startTime}#${availabilityId}`;

  const item = {
    PK: CalendarPK.AVAILABILITY(input.expertId),
    SK: skPrefix,
    entityType: EntityType.AVAILABILITY,
    availabilityId, // Store for easy reference
    ...availability,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CALENDAR,
      Item: item,
    })
  );

  console.log('[DBG][availabilityRepository] Availability created:', availabilityId);
  return availability;
}

/**
 * Get an availability slot by expertId and availabilityId
 * Note: Since SK includes type info, we query and filter by availabilityId
 */
export async function getAvailabilityById(
  expertId: string,
  availabilityId: string
): Promise<ExpertAvailability | null> {
  console.log('[DBG][availabilityRepository] Getting availability:', availabilityId);

  // Query all availabilities for expert and filter by availabilityId
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'availabilityId = :availId',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.AVAILABILITY(expertId),
        ':availId': availabilityId,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][availabilityRepository] Availability not found:', availabilityId);
    return null;
  }

  return mapToAvailability(result.Items[0]);
}

/**
 * Get an availability slot by ID only
 * Note: Requires expertId for efficiency, returns null without it
 */
export async function getAvailabilityByIdOnly(
  availabilityId: string
): Promise<ExpertAvailability | null> {
  console.log('[DBG][availabilityRepository] Getting availability by ID only:', availabilityId);
  console.warn(
    '[DBG][availabilityRepository] getAvailabilityByIdOnly requires expertId for efficiency'
  );
  return null;
}

/**
 * Get all availability slots for an expert
 */
export async function getAvailabilitiesByExpert(expertId: string): Promise<ExpertAvailability[]> {
  console.log('[DBG][availabilityRepository] Getting availabilities for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.AVAILABILITY(expertId),
      },
    })
  );

  const availabilities = (result.Items || []).map(mapToAvailability);
  console.log('[DBG][availabilityRepository] Found', availabilities.length, 'availabilities');
  return availabilities;
}

/**
 * Get active availability slots for an expert
 */
export async function getActiveAvailabilitiesByExpert(
  expertId: string
): Promise<ExpertAvailability[]> {
  const availabilities = await getAvailabilitiesByExpert(expertId);
  return availabilities.filter(a => a.isActive);
}

/**
 * Get recurring availability slots for an expert on a specific day
 * Uses SK prefix to filter efficiently
 */
export async function getRecurringAvailabilitiesByDay(
  expertId: string,
  dayOfWeek: number
): Promise<ExpertAvailability[]> {
  console.log('[DBG][availabilityRepository] Getting recurring availabilities for day:', dayOfWeek);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.AVAILABILITY(expertId),
        ':skPrefix': `RECURRING#${dayOfWeek}#`,
      },
    })
  );

  const availabilities = (result.Items || []).map(mapToAvailability).filter(a => a.isActive);

  console.log(
    '[DBG][availabilityRepository] Found',
    availabilities.length,
    'recurring availabilities'
  );
  return availabilities;
}

/**
 * Get one-time availability slots for an expert on a specific date
 * Uses SK prefix to filter efficiently
 */
export async function getAvailabilitiesByDate(
  expertId: string,
  date: string
): Promise<ExpertAvailability[]> {
  console.log('[DBG][availabilityRepository] Getting availabilities for date:', date);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CALENDAR,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CalendarPK.AVAILABILITY(expertId),
        ':skPrefix': `DATE#${date}#`,
      },
    })
  );

  const availabilities = (result.Items || []).map(mapToAvailability).filter(a => a.isActive);

  console.log(
    '[DBG][availabilityRepository] Found',
    availabilities.length,
    'date-specific availabilities'
  );
  return availabilities;
}

/**
 * Update an availability slot
 * Since SK includes type info, we need to find the item first
 */
export async function updateAvailability(
  expertId: string,
  availabilityId: string,
  updates: Partial<
    Pick<
      ExpertAvailability,
      'startTime' | 'endTime' | 'isActive' | 'sessionDuration' | 'bufferMinutes' | 'meetingLink'
    >
  >
): Promise<ExpertAvailability | null> {
  console.log('[DBG][availabilityRepository] Updating availability:', availabilityId);

  // First, find the current availability to get its SK
  const currentAvail = await getAvailabilityById(expertId, availabilityId);
  if (!currentAvail) {
    console.log('[DBG][availabilityRepository] Availability not found for update:', availabilityId);
    return null;
  }

  const now = new Date().toISOString();
  const updatedAvail: ExpertAvailability = {
    ...currentAvail,
    ...updates,
    updatedAt: now,
  };

  // Regenerate SK based on type
  const skPrefix = currentAvail.isRecurring
    ? `RECURRING#${currentAvail.dayOfWeek}#${updatedAvail.startTime}#${availabilityId}`
    : `DATE#${currentAvail.date}#${updatedAvail.startTime}#${availabilityId}`;

  const item = {
    PK: CalendarPK.AVAILABILITY(expertId),
    SK: skPrefix,
    entityType: EntityType.AVAILABILITY,
    availabilityId,
    ...updatedAvail,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CALENDAR,
      Item: item,
    })
  );

  console.log('[DBG][availabilityRepository] Availability updated:', availabilityId);
  return updatedAvail;
}

/**
 * Delete an availability slot
 * Since SK includes type info, we need to find the item first
 */
export async function deleteAvailability(
  expertId: string,
  availabilityId: string
): Promise<boolean> {
  console.log('[DBG][availabilityRepository] Deleting availability:', availabilityId);

  // Find the availability to get its exact SK
  const avail = await getAvailabilityById(expertId, availabilityId);
  if (!avail) {
    console.log('[DBG][availabilityRepository] Availability not found for delete:', availabilityId);
    return false;
  }

  // Reconstruct the SK
  const skPrefix = avail.isRecurring
    ? `RECURRING#${avail.dayOfWeek}#${avail.startTime}#${availabilityId}`
    : `DATE#${avail.date}#${avail.startTime}#${availabilityId}`;

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CALENDAR,
      Key: {
        PK: CalendarPK.AVAILABILITY(expertId),
        SK: skPrefix,
      },
    })
  );

  console.log('[DBG][availabilityRepository] Availability deleted:', availabilityId);
  return true;
}

/**
 * Map DynamoDB item to ExpertAvailability type
 */
function mapToAvailability(item: Record<string, unknown>): ExpertAvailability {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    dayOfWeek: item.dayOfWeek as number | undefined,
    date: item.date as string | undefined,
    startTime: item.startTime as string,
    endTime: item.endTime as string,
    isRecurring: item.isRecurring as boolean,
    isActive: (item.isActive as boolean) ?? true,
    sessionDuration: (item.sessionDuration as number) ?? 60,
    bufferMinutes: (item.bufferMinutes as number) ?? 0,
    meetingLink: item.meetingLink as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
