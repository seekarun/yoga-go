/**
 * Calendar Event Repository - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "CALEVENT#{date}#{eventId}"
 *
 * Date format YYYY-MM-DD enables efficient range queries with begins_with
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK, EntityType } from '../dynamodb';
import type {
  CalendarEvent,
  CalendarEventType,
  CalendarEventStatus,
  CreateCalendarEventInput,
} from '@/types';

// Type for DynamoDB CalendarEvent item (includes PK/SK)
interface DynamoDBCalendarEventItem extends CalendarEvent {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Convert DynamoDB item to CalendarEvent type (removes PK/SK)
 */
function toCalendarEvent(item: DynamoDBCalendarEventItem): CalendarEvent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, entityType, ...event } = item;
  return event as CalendarEvent;
}

/**
 * Extract date from ISO timestamp (YYYY-MM-DD)
 */
function extractDate(isoTimestamp: string): string {
  return isoTimestamp.substring(0, 10);
}

/**
 * Calculate duration in minutes from start and end times
 */
function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  return Math.round((end - start) / 60000);
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get calendar event by ID
 * @param tenantId - The tenant ID (expertId)
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 */
export async function getCalendarEventById(
  tenantId: string,
  date: string,
  eventId: string
): Promise<CalendarEvent | null> {
  console.log(
    '[DBG][calendarEventRepository] Getting event by id:',
    eventId,
    'for tenant:',
    tenantId
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.CALENDAR_EVENT(date, eventId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][calendarEventRepository] Event not found');
    return null;
  }

  console.log('[DBG][calendarEventRepository] Found event:', eventId);
  return toCalendarEvent(result.Item as DynamoDBCalendarEventItem);
}

/**
 * Get calendar event by ID only (searches all dates for the tenant)
 * Use when you don't know the date
 * @param tenantId - The tenant ID (expertId)
 * @param eventId - The event ID
 */
export async function getCalendarEventByIdOnly(
  tenantId: string,
  eventId: string
): Promise<CalendarEvent | null> {
  console.log(
    '[DBG][calendarEventRepository] Getting event by ID only:',
    eventId,
    'for tenant:',
    tenantId
  );

  // Query all calendar events and filter by eventId
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'id = :eventId',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': CorePK.CALENDAR_EVENT_PREFIX,
        ':eventId': eventId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][calendarEventRepository] Event not found by ID only');
    return null;
  }

  console.log('[DBG][calendarEventRepository] Found event by ID only:', eventId);
  return toCalendarEvent(result.Items[0] as DynamoDBCalendarEventItem);
}

/**
 * Get all calendar events for a tenant
 * @param tenantId - The tenant ID (expertId)
 */
export async function getTenantCalendarEvents(tenantId: string): Promise<CalendarEvent[]> {
  console.log('[DBG][calendarEventRepository] Getting all events for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': CorePK.CALENDAR_EVENT_PREFIX,
      },
    })
  );

  const events = (result.Items || []).map(item =>
    toCalendarEvent(item as DynamoDBCalendarEventItem)
  );
  console.log('[DBG][calendarEventRepository] Found', events.length, 'events');
  return events;
}

/**
 * Get calendar events by date range
 * @param tenantId - The tenant ID (expertId)
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function getCalendarEventsByDateRange(
  tenantId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> {
  console.log(
    '[DBG][calendarEventRepository] Getting events for range:',
    startDate,
    'to',
    endDate,
    'tenant:',
    tenantId
  );

  // Query using SK range with begins_with for each date in range
  // Since SK format is CALEVENT#{date}#{eventId}, we can use range query
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND SK BETWEEN :skStart AND :skEnd',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skStart': `CALEVENT#${startDate}`,
        ':skEnd': `CALEVENT#${endDate}~`, // ~ comes after any valid eventId character
      },
    })
  );

  const events = (result.Items || []).map(item =>
    toCalendarEvent(item as DynamoDBCalendarEventItem)
  );
  console.log('[DBG][calendarEventRepository] Found', events.length, 'events in range');
  return events;
}

/**
 * Get calendar events for a specific month
 * @param tenantId - The tenant ID (expertId)
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12)
 */
export async function getCalendarEventsForMonth(
  tenantId: string,
  year: number,
  month: number
): Promise<CalendarEvent[]> {
  const monthStr = String(month).padStart(2, '0');
  const prefix = `${year}-${monthStr}`;

  console.log(
    '[DBG][calendarEventRepository] Getting events for month:',
    prefix,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `CALEVENT#${prefix}`,
      },
    })
  );

  const events = (result.Items || []).map(item =>
    toCalendarEvent(item as DynamoDBCalendarEventItem)
  );
  console.log('[DBG][calendarEventRepository] Found', events.length, 'events for month');
  return events;
}

/**
 * Get upcoming calendar events (next N events starting from now)
 * @param tenantId - The tenant ID (expertId)
 * @param limit - Maximum number of events to return (default 10)
 */
export async function getUpcomingCalendarEvents(
  tenantId: string,
  limit: number = 10
): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().substring(0, 10);

  console.log(
    '[DBG][calendarEventRepository] Getting upcoming events from:',
    today,
    'tenant:',
    tenantId
  );

  // Get events from today onwards
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND SK >= :skStart',
      FilterExpression: 'begins_with(SK, :prefix) AND #status = :scheduled',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skStart': `CALEVENT#${today}`,
        ':prefix': CorePK.CALENDAR_EVENT_PREFIX,
        ':scheduled': 'scheduled',
      },
    })
  );

  const events = (result.Items || [])
    .map(item => toCalendarEvent(item as DynamoDBCalendarEventItem))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, limit);

  console.log('[DBG][calendarEventRepository] Found', events.length, 'upcoming events');
  return events;
}

/**
 * Create a new calendar event
 * @param tenantId - The tenant ID (expertId)
 * @param input - Calendar event creation input
 */
export async function createCalendarEvent(
  tenantId: string,
  input: CreateCalendarEventInput
): Promise<CalendarEvent> {
  const now = new Date().toISOString();
  const eventId = generateEventId();
  const date = extractDate(input.startTime);
  const duration = calculateDuration(input.startTime, input.endTime);

  console.log('[DBG][calendarEventRepository] Creating event:', eventId, 'for tenant:', tenantId);

  const event: DynamoDBCalendarEventItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.CALENDAR_EVENT(date, eventId),
    entityType: EntityType.CALENDAR_EVENT,
    id: eventId,
    expertId: tenantId,
    title: input.title,
    description: input.description,
    date,
    startTime: input.startTime,
    endTime: input.endTime,
    duration,
    type: input.type,
    status: 'scheduled' as CalendarEventStatus,
    webinarId: input.webinarId,
    sessionId: input.sessionId,
    meetingLink: input.meetingLink,
    location: input.location,
    isAllDay: input.isAllDay,
    color: input.color,
    notes: input.notes,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: event,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    })
  );

  console.log('[DBG][calendarEventRepository] Created event:', eventId);
  return toCalendarEvent(event);
}

/**
 * Update a calendar event
 * Note: If date changes, the event must be deleted and recreated
 * @param tenantId - The tenant ID (expertId)
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 * @param updates - Partial update fields
 */
export async function updateCalendarEvent(
  tenantId: string,
  date: string,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, 'id' | 'expertId' | 'createdAt'>>
): Promise<CalendarEvent | null> {
  console.log('[DBG][calendarEventRepository] Updating event:', eventId, 'for tenant:', tenantId);

  // Check if date is changing - if so, need to delete and recreate
  if (updates.startTime) {
    const newDate = extractDate(updates.startTime);
    if (newDate !== date) {
      console.log('[DBG][calendarEventRepository] Date changed, deleting and recreating');

      // Get current event
      const currentEvent = await getCalendarEventById(tenantId, date, eventId);
      if (!currentEvent) {
        return null;
      }

      // Delete old event
      await deleteCalendarEvent(tenantId, date, eventId);

      // Create new event with updated data
      const newInput: CreateCalendarEventInput = {
        title: updates.title ?? currentEvent.title,
        description: updates.description ?? currentEvent.description,
        startTime: updates.startTime,
        endTime: updates.endTime ?? currentEvent.endTime,
        type: updates.type ?? currentEvent.type,
        webinarId: updates.webinarId ?? currentEvent.webinarId,
        sessionId: updates.sessionId ?? currentEvent.sessionId,
        meetingLink: updates.meetingLink ?? currentEvent.meetingLink,
        location: updates.location ?? currentEvent.location,
        isAllDay: updates.isAllDay ?? currentEvent.isAllDay,
        color: updates.color ?? currentEvent.color,
        notes: updates.notes ?? currentEvent.notes,
      };

      return createCalendarEvent(tenantId, newInput);
    }
  }

  // Build update expression
  const updateParts: string[] = [];
  const expressionAttrNames: Record<string, string> = {};
  const expressionAttrValues: Record<string, unknown> = {};

  // Always update timestamp
  updateParts.push('#updatedAt = :updatedAt');
  expressionAttrNames['#updatedAt'] = 'updatedAt';
  expressionAttrValues[':updatedAt'] = new Date().toISOString();

  // Add fields to update
  const fieldMappings: Record<string, keyof typeof updates> = {
    title: 'title',
    description: 'description',
    endTime: 'endTime',
    type: 'type',
    status: 'status',
    meetingLink: 'meetingLink',
    location: 'location',
    isAllDay: 'isAllDay',
    color: 'color',
    notes: 'notes',
  };

  for (const [field, key] of Object.entries(fieldMappings)) {
    if (updates[key] !== undefined) {
      updateParts.push(`#${field} = :${field}`);
      expressionAttrNames[`#${field}`] = field;
      expressionAttrValues[`:${field}`] = updates[key];
    }
  }

  // Recalculate duration if endTime changed
  if (updates.endTime) {
    const currentEvent = await getCalendarEventById(tenantId, date, eventId);
    if (currentEvent) {
      const startTime = updates.startTime ?? currentEvent.startTime;
      const duration = calculateDuration(startTime, updates.endTime);
      updateParts.push('#duration = :duration');
      expressionAttrNames['#duration'] = 'duration';
      expressionAttrValues[':duration'] = duration;
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.CALENDAR_EVENT(date, eventId),
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: expressionAttrNames,
      ExpressionAttributeValues: expressionAttrValues,
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    console.log('[DBG][calendarEventRepository] Event not found for update');
    return null;
  }

  console.log('[DBG][calendarEventRepository] Updated event:', eventId);
  return toCalendarEvent(result.Attributes as DynamoDBCalendarEventItem);
}

/**
 * Update calendar event status
 * @param tenantId - The tenant ID (expertId)
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 * @param status - New status
 */
export async function updateCalendarEventStatus(
  tenantId: string,
  date: string,
  eventId: string,
  status: CalendarEventStatus
): Promise<CalendarEvent | null> {
  console.log(
    '[DBG][calendarEventRepository] Updating event status:',
    eventId,
    'to:',
    status,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.CALENDAR_EVENT(date, eventId),
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
      },
      ConditionExpression: 'attribute_exists(PK)',
      ReturnValues: 'ALL_NEW',
    })
  );

  if (!result.Attributes) {
    return null;
  }

  return toCalendarEvent(result.Attributes as DynamoDBCalendarEventItem);
}

/**
 * Delete a calendar event
 * @param tenantId - The tenant ID (expertId)
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 */
export async function deleteCalendarEvent(
  tenantId: string,
  date: string,
  eventId: string
): Promise<boolean> {
  console.log('[DBG][calendarEventRepository] Deleting event:', eventId, 'for tenant:', tenantId);

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: Tables.CORE,
        Key: {
          PK: CorePK.TENANT(tenantId),
          SK: CorePK.CALENDAR_EVENT(date, eventId),
        },
        ConditionExpression: 'attribute_exists(PK)',
      })
    );

    console.log('[DBG][calendarEventRepository] Deleted event:', eventId);
    return true;
  } catch (error) {
    console.error('[DBG][calendarEventRepository] Error deleting event:', error);
    return false;
  }
}

/**
 * Get calendar events by type
 * @param tenantId - The tenant ID (expertId)
 * @param type - Event type ('general' or 'live_session')
 */
export async function getCalendarEventsByType(
  tenantId: string,
  type: CalendarEventType
): Promise<CalendarEvent[]> {
  console.log('[DBG][calendarEventRepository] Getting events by type:', type, 'tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: '#type = :type',
      ExpressionAttributeNames: {
        '#type': 'type',
      },
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': CorePK.CALENDAR_EVENT_PREFIX,
        ':type': type,
      },
    })
  );

  const events = (result.Items || []).map(item =>
    toCalendarEvent(item as DynamoDBCalendarEventItem)
  );
  console.log('[DBG][calendarEventRepository] Found', events.length, 'events of type', type);
  return events;
}
