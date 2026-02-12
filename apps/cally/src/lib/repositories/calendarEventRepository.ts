/**
 * Calendar Event Repository for Cally - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "CALEVENT#{date}#{eventId}"
 *
 * Date format YYYY-MM-DD enables efficient range queries with begins_with
 *
 * Note: Cally only supports "general" events (no webinars/live sessions)
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type {
  CalendarEvent,
  CalendarEventStatus,
  CreateCalendarEventInput,
} from "@/types";

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
 * @param tenantId - The tenant ID
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 */
export async function getCalendarEventById(
  tenantId: string,
  date: string,
  eventId: string,
): Promise<CalendarEvent | null> {
  console.log(
    "[DBG][calendarEventRepository] Getting event by id:",
    eventId,
    "for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.CALENDAR_EVENT(date, eventId),
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][calendarEventRepository] Event not found");
    return null;
  }

  console.log("[DBG][calendarEventRepository] Found event:", eventId);
  return toCalendarEvent(result.Item as DynamoDBCalendarEventItem);
}

/**
 * Get calendar event by ID only (searches all dates for the tenant)
 * Use when you don't know the date
 * @param tenantId - The tenant ID
 * @param eventId - The event ID
 */
export async function getCalendarEventByIdOnly(
  tenantId: string,
  eventId: string,
): Promise<CalendarEvent | null> {
  console.log(
    "[DBG][calendarEventRepository] Getting event by ID only:",
    eventId,
    "for tenant:",
    tenantId,
  );

  // Query all calendar events and filter by eventId
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "id = :eventId",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.CALENDAR_EVENT_PREFIX,
        ":eventId": eventId,
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][calendarEventRepository] Event not found by ID only");
    return null;
  }

  console.log(
    "[DBG][calendarEventRepository] Found event by ID only:",
    eventId,
  );
  return toCalendarEvent(result.Items[0] as DynamoDBCalendarEventItem);
}

/**
 * Get all calendar events for a tenant
 * @param tenantId - The tenant ID
 */
export async function getTenantCalendarEvents(
  tenantId: string,
): Promise<CalendarEvent[]> {
  console.log(
    "[DBG][calendarEventRepository] Getting all events for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.CALENDAR_EVENT_PREFIX,
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toCalendarEvent(item as DynamoDBCalendarEventItem),
  );
  console.log("[DBG][calendarEventRepository] Found", events.length, "events");
  return events;
}

/**
 * Get calendar events by date range
 * @param tenantId - The tenant ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 */
export async function getCalendarEventsByDateRange(
  tenantId: string,
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  console.log(
    "[DBG][calendarEventRepository] Getting events for range:",
    startDate,
    "to",
    endDate,
    "tenant:",
    tenantId,
  );

  // Query using SK range with begins_with for each date in range
  // Since SK format is CALEVENT#{date}#{eventId}, we can use range query
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :skStart AND :skEnd",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skStart": `CALEVENT#${startDate}`,
        ":skEnd": `CALEVENT#${endDate}~`, // ~ comes after any valid eventId character
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toCalendarEvent(item as DynamoDBCalendarEventItem),
  );
  console.log(
    "[DBG][calendarEventRepository] Found",
    events.length,
    "events in range",
  );
  return events;
}

/**
 * Get calendar events for a specific month
 * @param tenantId - The tenant ID
 * @param year - Year (e.g., 2024)
 * @param month - Month (1-12)
 */
export async function getCalendarEventsForMonth(
  tenantId: string,
  year: number,
  month: number,
): Promise<CalendarEvent[]> {
  const monthStr = String(month).padStart(2, "0");
  const prefix = `${year}-${monthStr}`;

  console.log(
    "[DBG][calendarEventRepository] Getting events for month:",
    prefix,
    "tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": `CALEVENT#${prefix}`,
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toCalendarEvent(item as DynamoDBCalendarEventItem),
  );
  console.log(
    "[DBG][calendarEventRepository] Found",
    events.length,
    "events for month",
  );
  return events;
}

/**
 * Get upcoming calendar events (next N events starting from now)
 * @param tenantId - The tenant ID
 * @param limit - Maximum number of events to return (default 10)
 */
export async function getUpcomingCalendarEvents(
  tenantId: string,
  limit: number = 10,
): Promise<CalendarEvent[]> {
  const today = new Date().toISOString().substring(0, 10);

  console.log(
    "[DBG][calendarEventRepository] Getting upcoming events from:",
    today,
    "tenant:",
    tenantId,
  );

  // Get events from today onwards
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND SK >= :skStart",
      FilterExpression: "begins_with(SK, :prefix) AND #status = :scheduled",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skStart": `CALEVENT#${today}`,
        ":prefix": TenantPK.CALENDAR_EVENT_PREFIX,
        ":scheduled": "scheduled",
      },
    }),
  );

  const events = (result.Items || [])
    .map((item) => toCalendarEvent(item as DynamoDBCalendarEventItem))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .slice(0, limit);

  console.log(
    "[DBG][calendarEventRepository] Found",
    events.length,
    "upcoming events",
  );
  return events;
}

/**
 * Update color on all future events linked to a product
 */
export async function updateEventColorByProductId(
  tenantId: string,
  productId: string,
  newColor: string,
): Promise<number> {
  const today = new Date().toISOString().substring(0, 10);

  console.log(
    `[DBG][calendarEventRepository] Updating color for product ${productId} events from ${today}`,
  );

  // Query future events and filter by productId
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND SK >= :skStart",
      FilterExpression: "begins_with(SK, :prefix) AND productId = :productId",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skStart": `CALEVENT#${today}`,
        ":prefix": TenantPK.CALENDAR_EVENT_PREFIX,
        ":productId": productId,
      },
    }),
  );

  const events = (result.Items || []) as DynamoDBCalendarEventItem[];
  let updated = 0;

  for (const item of events) {
    if (item.color === newColor) continue;

    await docClient.send(
      new UpdateCommand({
        TableName: Tables.CORE,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: "SET #color = :color, #updatedAt = :updatedAt",
        ExpressionAttributeNames: {
          "#color": "color",
          "#updatedAt": "updatedAt",
        },
        ExpressionAttributeValues: {
          ":color": newColor,
          ":updatedAt": new Date().toISOString(),
        },
      }),
    );
    updated++;
  }

  console.log(
    `[DBG][calendarEventRepository] Updated color on ${updated} events for product ${productId}`,
  );
  return updated;
}

/**
 * Create a new calendar event
 * @param tenantId - The tenant ID
 * @param input - Calendar event creation input
 */
export async function createCalendarEvent(
  tenantId: string,
  input: CreateCalendarEventInput,
): Promise<CalendarEvent> {
  const now = new Date().toISOString();
  const eventId = generateEventId();
  const date = input.date ?? extractDate(input.startTime);
  const duration = calculateDuration(input.startTime, input.endTime);

  console.log(
    "[DBG][calendarEventRepository] Creating event:",
    eventId,
    "for tenant:",
    tenantId,
  );

  const event: DynamoDBCalendarEventItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.CALENDAR_EVENT(date, eventId),
    entityType: EntityType.CALENDAR_EVENT,
    id: eventId,
    expertId: tenantId,
    title: input.title,
    description: input.description,
    date,
    startTime: input.startTime,
    endTime: input.endTime,
    duration,
    type: "general", // Cally only supports general events
    status: input.status ?? ("scheduled" as CalendarEventStatus),
    location: input.location,
    isAllDay: input.isAllDay,
    color: input.color,
    notes: input.notes,
    // 100ms Video conferencing
    hasVideoConference: input.hasVideoConference,
    hmsRoomId: input.hmsRoomId,
    hmsTemplateId: input.hmsTemplateId,
    // Spam detection
    flaggedAsSpam: input.flaggedAsSpam,
    // Visitor geolocation metadata
    visitorInfo: input.visitorInfo,
    // External meeting link (Zoom, Google Meet, etc.)
    meetingLink: input.meetingLink,
    // Google Calendar sync
    googleCalendarEventId: input.googleCalendarEventId,
    // Outlook Calendar sync
    outlookCalendarEventId: input.outlookCalendarEventId,
    // Recurrence
    recurrenceGroupId: input.recurrenceGroupId,
    recurrenceRule: input.recurrenceRule,
    // Attendees
    attendees: input.attendees,
    // Stripe payment
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    stripePaymentIntentId: input.stripePaymentIntentId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: event,
      ConditionExpression: "attribute_not_exists(PK)", // Prevent overwriting
    }),
  );

  console.log("[DBG][calendarEventRepository] Created event:", eventId);
  return toCalendarEvent(event);
}

/**
 * Update a calendar event
 * Note: If date changes, the event must be deleted and recreated
 * @param tenantId - The tenant ID
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 * @param updates - Partial update fields
 */
export async function updateCalendarEvent(
  tenantId: string,
  date: string,
  eventId: string,
  updates: Partial<Omit<CalendarEvent, "id" | "expertId" | "createdAt">>,
): Promise<CalendarEvent | null> {
  console.log(
    "[DBG][calendarEventRepository] Updating event:",
    eventId,
    "for tenant:",
    tenantId,
  );

  // Check if date is changing - if so, need to delete and recreate
  if (updates.startTime) {
    const newDate = extractDate(updates.startTime);
    if (newDate !== date) {
      console.log(
        "[DBG][calendarEventRepository] Date changed, deleting and recreating",
      );

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
        type: "general", // Cally only supports general events
        location: updates.location ?? currentEvent.location,
        isAllDay: updates.isAllDay ?? currentEvent.isAllDay,
        color: updates.color ?? currentEvent.color,
        notes: updates.notes ?? currentEvent.notes,
        // 100ms Video conferencing
        hasVideoConference:
          updates.hasVideoConference ?? currentEvent.hasVideoConference,
        hmsRoomId: updates.hmsRoomId ?? currentEvent.hmsRoomId,
        hmsTemplateId: updates.hmsTemplateId ?? currentEvent.hmsTemplateId,
      };

      return createCalendarEvent(tenantId, newInput);
    }
  }

  // Build update expression
  const updateParts: string[] = [];
  const expressionAttrNames: Record<string, string> = {};
  const expressionAttrValues: Record<string, unknown> = {};

  // Always update timestamp
  updateParts.push("#updatedAt = :updatedAt");
  expressionAttrNames["#updatedAt"] = "updatedAt";
  expressionAttrValues[":updatedAt"] = new Date().toISOString();

  // Add fields to update
  const fieldMappings: Record<string, keyof typeof updates> = {
    title: "title",
    description: "description",
    startTime: "startTime",
    endTime: "endTime",
    status: "status",
    location: "location",
    isAllDay: "isAllDay",
    color: "color",
    notes: "notes",
    // 100ms Video conferencing
    hasVideoConference: "hasVideoConference",
    hmsRoomId: "hmsRoomId",
    hmsTemplateId: "hmsTemplateId",
    // Spam detection
    flaggedAsSpam: "flaggedAsSpam",
    // Visitor geolocation metadata
    visitorInfo: "visitorInfo",
    meetingLink: "meetingLink",
    // Google Calendar sync
    googleCalendarEventId: "googleCalendarEventId",
    // Outlook Calendar sync
    outlookCalendarEventId: "outlookCalendarEventId",
    // Recurrence
    recurrenceGroupId: "recurrenceGroupId",
    recurrenceRule: "recurrenceRule",
    // Attendees
    attendees: "attendees",
    // Product link
    productId: "productId",
    // Stripe payment
    stripeCheckoutSessionId: "stripeCheckoutSessionId",
    stripePaymentIntentId: "stripePaymentIntentId",
    // Reminder tracking
    reminder24hSentAt: "reminder24hSentAt",
    reminder10mSentAt: "reminder10mSentAt",
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
      updateParts.push("#duration = :duration");
      expressionAttrNames["#duration"] = "duration";
      expressionAttrValues[":duration"] = duration;
    }
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.CALENDAR_EVENT(date, eventId),
      },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: expressionAttrNames,
      ExpressionAttributeValues: expressionAttrValues,
      ConditionExpression: "attribute_exists(PK)",
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!result.Attributes) {
    console.log("[DBG][calendarEventRepository] Event not found for update");
    return null;
  }

  console.log("[DBG][calendarEventRepository] Updated event:", eventId);
  return toCalendarEvent(result.Attributes as DynamoDBCalendarEventItem);
}

/**
 * Update calendar event status
 * @param tenantId - The tenant ID
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 * @param status - New status
 */
export async function updateCalendarEventStatus(
  tenantId: string,
  date: string,
  eventId: string,
  status: CalendarEventStatus,
): Promise<CalendarEvent | null> {
  console.log(
    "[DBG][calendarEventRepository] Updating event status:",
    eventId,
    "to:",
    status,
    "tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.CALENDAR_EVENT(date, eventId),
      },
      UpdateExpression: "SET #status = :status, #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#status": "status",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":status": status,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(PK)",
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!result.Attributes) {
    return null;
  }

  return toCalendarEvent(result.Attributes as DynamoDBCalendarEventItem);
}

/**
 * Delete a calendar event
 * @param tenantId - The tenant ID
 * @param date - The event date (YYYY-MM-DD)
 * @param eventId - The event ID
 */
export async function deleteCalendarEvent(
  tenantId: string,
  date: string,
  eventId: string,
): Promise<boolean> {
  console.log(
    "[DBG][calendarEventRepository] Deleting event:",
    eventId,
    "for tenant:",
    tenantId,
  );

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: Tables.CORE,
        Key: {
          PK: TenantPK.TENANT(tenantId),
          SK: TenantPK.CALENDAR_EVENT(date, eventId),
        },
        ConditionExpression: "attribute_exists(PK)",
      }),
    );

    console.log("[DBG][calendarEventRepository] Deleted event:", eventId);
    return true;
  } catch (error) {
    console.error(
      "[DBG][calendarEventRepository] Error deleting event:",
      error,
    );
    return false;
  }
}

/**
 * Get all calendar events in a recurrence group
 * @param tenantId - The tenant ID
 * @param recurrenceGroupId - The recurrence group ID
 */
export async function getCalendarEventsByRecurrenceGroup(
  tenantId: string,
  recurrenceGroupId: string,
): Promise<CalendarEvent[]> {
  console.log(
    "[DBG][calendarEventRepository] Getting events by recurrence group:",
    recurrenceGroupId,
    "for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      FilterExpression: "recurrenceGroupId = :groupId",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.CALENDAR_EVENT_PREFIX,
        ":groupId": recurrenceGroupId,
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toCalendarEvent(item as DynamoDBCalendarEventItem),
  );
  console.log(
    "[DBG][calendarEventRepository] Found",
    events.length,
    "events in recurrence group",
  );
  return events;
}

/**
 * Delete all calendar events in a recurrence group (batch delete, 25 per batch)
 * @param tenantId - The tenant ID
 * @param recurrenceGroupId - The recurrence group ID
 * @returns Array of deleted events (for sync cleanup)
 */
export async function deleteCalendarEventsByRecurrenceGroup(
  tenantId: string,
  recurrenceGroupId: string,
): Promise<CalendarEvent[]> {
  console.log(
    "[DBG][calendarEventRepository] Batch deleting recurrence group:",
    recurrenceGroupId,
    "for tenant:",
    tenantId,
  );

  const events = await getCalendarEventsByRecurrenceGroup(
    tenantId,
    recurrenceGroupId,
  );

  if (events.length === 0) {
    console.log(
      "[DBG][calendarEventRepository] No events found in recurrence group",
    );
    return [];
  }

  // DynamoDB BatchWriteItem supports max 25 items per batch
  const BATCH_SIZE = 25;
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const batch = events.slice(i, i + BATCH_SIZE);
    const deleteRequests = batch.map((event) => ({
      DeleteRequest: {
        Key: {
          PK: TenantPK.TENANT(tenantId),
          SK: TenantPK.CALENDAR_EVENT(event.date, event.id),
        },
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [Tables.CORE]: deleteRequests,
        },
      }),
    );
  }

  console.log(
    "[DBG][calendarEventRepository] Batch deleted",
    events.length,
    "events from recurrence group",
  );
  return events;
}

/**
 * Get calendar event by 100ms room ID
 * Uses a table scan since hmsRoomId is not indexed.
 * Acceptable for low-volume webhook usage.
 * @param roomId - The 100ms room ID
 */
export async function getCalendarEventByHmsRoomId(
  roomId: string,
): Promise<CalendarEvent | null> {
  console.log(
    "[DBG][calendarEventRepository] Getting event by hmsRoomId:",
    roomId,
  );

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression: "entityType = :entityType AND hmsRoomId = :roomId",
      ExpressionAttributeValues: {
        ":entityType": EntityType.CALENDAR_EVENT,
        ":roomId": roomId,
      },
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log(
      "[DBG][calendarEventRepository] No event found for hmsRoomId:",
      roomId,
    );
    return null;
  }

  console.log(
    "[DBG][calendarEventRepository] Found event for hmsRoomId:",
    roomId,
  );
  return toCalendarEvent(result.Items[0] as DynamoDBCalendarEventItem);
}
