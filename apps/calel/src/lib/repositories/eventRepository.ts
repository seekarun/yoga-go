/**
 * Calel Calendar Event Repository - DynamoDB Operations
 *
 * Calendar events are personal appointments/events for a host.
 *
 * Storage pattern:
 * - Primary: PK="EVENT#HOST#{hostId}", SK={date}#{eventId}
 */

import {
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, CalendarEventPK, EntityType } from "../dynamodb";
import { randomBytes } from "crypto";

// Calendar event type (matches frontend CalendarEvent)
export interface CalendarEvent {
  id: string;
  hostId: string;
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  tagId?: string;
  createdAt: string;
  updatedAt: string;
}

// Type for DynamoDB event item (includes PK/SK)
interface DynamoDBEventItem extends CalendarEvent {
  PK: string;
  SK: string;
  entityType: string;
}

// Type for creating a new event
export interface CreateEventInput {
  hostId: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  tagId?: string;
}

// Type for updating an event
export interface UpdateEventInput {
  title?: string;
  description?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  tagId?: string;
}

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return `evt_${randomBytes(12).toString("hex")}`;
}

/**
 * Convert DynamoDB item to CalendarEvent type (removes PK/SK)
 */
function toEvent(item: DynamoDBEventItem): CalendarEvent {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, entityType, ...event } = item;
  return event as CalendarEvent;
}

/**
 * Get event by ID
 */
export async function getEventById(
  hostId: string,
  date: string,
  eventId: string,
): Promise<CalendarEvent | null> {
  console.log(
    "[DBG][eventRepository] Getting event:",
    eventId,
    "hostId:",
    hostId,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CalendarEventPK.HOST(hostId),
        SK: `${date}#${eventId}`,
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][eventRepository] Event not found");
    return null;
  }

  console.log("[DBG][eventRepository] Found event:", eventId);
  return toEvent(result.Item as DynamoDBEventItem);
}

/**
 * Get all events for a host
 */
export async function getEventsByHost(
  hostId: string,
): Promise<CalendarEvent[]> {
  console.log("[DBG][eventRepository] Getting events for host:", hostId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": CalendarEventPK.HOST(hostId),
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toEvent(item as DynamoDBEventItem),
  );
  console.log("[DBG][eventRepository] Found", events.length, "events");
  return events;
}

/**
 * Get events for a host within a date range
 */
export async function getEventsByDateRange(
  hostId: string,
  startDate: string,
  endDate: string,
): Promise<CalendarEvent[]> {
  console.log(
    "[DBG][eventRepository] Getting events for host:",
    hostId,
    "from:",
    startDate,
    "to:",
    endDate,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND SK BETWEEN :start AND :end",
      ExpressionAttributeValues: {
        ":pk": CalendarEventPK.HOST(hostId),
        ":start": startDate,
        ":end": `${endDate}~`, // ~ is after z in ASCII, ensures we get all events on endDate
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toEvent(item as DynamoDBEventItem),
  );
  console.log("[DBG][eventRepository] Found", events.length, "events in range");
  return events;
}

/**
 * Get events for a specific date
 */
export async function getEventsByDate(
  hostId: string,
  date: string,
): Promise<CalendarEvent[]> {
  console.log(
    "[DBG][eventRepository] Getting events for host:",
    hostId,
    "date:",
    date,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :date)",
      ExpressionAttributeValues: {
        ":pk": CalendarEventPK.HOST(hostId),
        ":date": date,
      },
    }),
  );

  const events = (result.Items || []).map((item) =>
    toEvent(item as DynamoDBEventItem),
  );
  console.log("[DBG][eventRepository] Found", events.length, "events for date");
  return events;
}

/**
 * Create a new event
 */
export async function createEvent(
  input: CreateEventInput,
): Promise<CalendarEvent> {
  const now = new Date().toISOString();
  const eventId = generateEventId();

  console.log(
    "[DBG][eventRepository] Creating event:",
    eventId,
    "for host:",
    input.hostId,
  );

  const item: DynamoDBEventItem = {
    PK: CalendarEventPK.HOST(input.hostId),
    SK: `${input.date}#${eventId}`,
    entityType: EntityType.CALENDAR_EVENT,
    id: eventId,
    hostId: input.hostId,
    title: input.title,
    description: input.description,
    date: input.date,
    startTime: input.startTime,
    endTime: input.endTime,
    tagId: input.tagId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    }),
  );

  console.log("[DBG][eventRepository] Created event:", eventId);
  return toEvent(item);
}

/**
 * Update an event
 */
export async function updateEvent(
  hostId: string,
  date: string,
  eventId: string,
  updates: UpdateEventInput,
): Promise<CalendarEvent | null> {
  console.log("[DBG][eventRepository] Updating event:", eventId);

  // Get existing event first
  const existing = await getEventById(hostId, date, eventId);
  if (!existing) {
    console.log("[DBG][eventRepository] Event not found for update");
    return null;
  }

  const now = new Date().toISOString();

  // If date is changing, we need to delete and recreate (SK contains date)
  if (updates.date && updates.date !== date) {
    // Delete old item
    await deleteEvent(hostId, date, eventId);

    // Create new item with new date
    const newItem: DynamoDBEventItem = {
      PK: CalendarEventPK.HOST(hostId),
      SK: `${updates.date}#${eventId}`,
      entityType: EntityType.CALENDAR_EVENT,
      id: eventId,
      hostId,
      title: updates.title ?? existing.title,
      description: updates.description ?? existing.description,
      date: updates.date,
      startTime: updates.startTime ?? existing.startTime,
      endTime: updates.endTime ?? existing.endTime,
      tagId: updates.tagId ?? existing.tagId,
      createdAt: existing.createdAt,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: newItem,
      }),
    );

    console.log("[DBG][eventRepository] Updated event with new date:", eventId);
    return toEvent(newItem);
  }

  // Simple update (no date change)
  const updatedItem: DynamoDBEventItem = {
    PK: CalendarEventPK.HOST(hostId),
    SK: `${date}#${eventId}`,
    entityType: EntityType.CALENDAR_EVENT,
    id: eventId,
    hostId,
    title: updates.title ?? existing.title,
    description: updates.description ?? existing.description,
    date,
    startTime: updates.startTime ?? existing.startTime,
    endTime: updates.endTime ?? existing.endTime,
    tagId: updates.tagId ?? existing.tagId,
    createdAt: existing.createdAt,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: updatedItem,
    }),
  );

  console.log("[DBG][eventRepository] Updated event:", eventId);
  return toEvent(updatedItem);
}

/**
 * Delete an event
 */
export async function deleteEvent(
  hostId: string,
  date: string,
  eventId: string,
): Promise<void> {
  console.log("[DBG][eventRepository] Deleting event:", eventId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CalendarEventPK.HOST(hostId),
        SK: `${date}#${eventId}`,
      },
    }),
  );

  console.log("[DBG][eventRepository] Deleted event:", eventId);
}
