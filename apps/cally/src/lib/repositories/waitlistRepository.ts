/**
 * Waitlist Repository for CallyGo - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="WAITLIST#{date}#{entryId}"
 *
 * Queries:
 * - List by date: Query PK, SK begins_with "WAITLIST#{date}#"
 * - Get entry: GetItem PK + SK
 * - All waitlists (for cron): Scan entityType=WAITLIST, status=waiting
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { WaitlistEntry } from "@/types";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBWaitlistItem extends WaitlistEntry {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean WaitlistEntry
 */
function toWaitlistEntry(item: DynamoDBWaitlistItem): WaitlistEntry {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...entry } = item;
  return entry;
}

/**
 * Add a visitor to the waitlist for a specific date.
 * Auto-assigns position based on existing entries.
 */
export async function addToWaitlist(
  tenantId: string,
  input: Omit<WaitlistEntry, "position" | "status" | "createdAt">,
): Promise<WaitlistEntry> {
  console.log(
    `[DBG][waitlistRepository] Adding ${input.visitorEmail} to waitlist for ${input.date} (tenant ${tenantId})`,
  );

  // Count existing entries to determine position
  const existing = await getWaitlistByDate(tenantId, input.date);
  const position = existing.length + 1;

  const entry: WaitlistEntry = {
    ...input,
    position,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };

  const item: DynamoDBWaitlistItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.WAITLIST(input.date, input.id),
    entityType: EntityType.WAITLIST,
    ...entry,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    }),
  );

  console.log(
    `[DBG][waitlistRepository] Added to waitlist at position ${position}`,
  );
  return entry;
}

/**
 * Get all waitlist entries for a specific date, sorted by position
 */
export async function getWaitlistByDate(
  tenantId: string,
  date: string,
): Promise<WaitlistEntry[]> {
  console.log(
    `[DBG][waitlistRepository] Getting waitlist for date ${date} (tenant ${tenantId})`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.WAITLIST_DATE_PREFIX(date),
      },
    }),
  );

  const entries = (result.Items || []).map((item) =>
    toWaitlistEntry(item as DynamoDBWaitlistItem),
  );

  // Sort by position ascending
  entries.sort((a, b) => a.position - b.position);

  console.log(
    `[DBG][waitlistRepository] Found ${entries.length} waitlist entries for ${date}`,
  );
  return entries;
}

/**
 * Get a specific waitlist entry
 */
export async function getWaitlistEntry(
  tenantId: string,
  date: string,
  entryId: string,
): Promise<WaitlistEntry | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.WAITLIST(date, entryId),
      },
    }),
  );

  if (!result.Item) return null;
  return toWaitlistEntry(result.Item as DynamoDBWaitlistItem);
}

/**
 * Update a waitlist entry (status, notifiedAt, expiresAt, bookedAt)
 */
export async function updateWaitlistEntry(
  tenantId: string,
  date: string,
  entryId: string,
  updates: Partial<
    Pick<WaitlistEntry, "status" | "notifiedAt" | "expiresAt" | "bookedAt">
  >,
): Promise<WaitlistEntry | null> {
  console.log(
    `[DBG][waitlistRepository] Updating entry ${entryId} for ${date}:`,
    updates,
  );

  const expressionParts: string[] = [];
  const expressionValues: Record<string, string> = {};
  const expressionNames: Record<string, string> = {};

  if (updates.status !== undefined) {
    expressionParts.push("#st = :st");
    expressionValues[":st"] = updates.status;
    expressionNames["#st"] = "status";
  }
  if (updates.notifiedAt !== undefined) {
    expressionParts.push("notifiedAt = :notifiedAt");
    expressionValues[":notifiedAt"] = updates.notifiedAt;
  }
  if (updates.expiresAt !== undefined) {
    expressionParts.push("expiresAt = :expiresAt");
    expressionValues[":expiresAt"] = updates.expiresAt;
  }
  if (updates.bookedAt !== undefined) {
    expressionParts.push("bookedAt = :bookedAt");
    expressionValues[":bookedAt"] = updates.bookedAt;
  }

  if (expressionParts.length === 0) return null;

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.WAITLIST(date, entryId),
      },
      UpdateExpression: `SET ${expressionParts.join(", ")}`,
      ExpressionAttributeValues: expressionValues,
      ...(Object.keys(expressionNames).length > 0 && {
        ExpressionAttributeNames: expressionNames,
      }),
      ReturnValues: "ALL_NEW",
    }),
  );

  if (!result.Attributes) return null;
  return toWaitlistEntry(result.Attributes as DynamoDBWaitlistItem);
}

/**
 * Find a waitlist entry by email for a specific date (duplicate check)
 */
export async function getWaitlistByEmail(
  tenantId: string,
  date: string,
  email: string,
): Promise<WaitlistEntry | null> {
  const entries = await getWaitlistByDate(tenantId, date);
  const normalized = email.toLowerCase().trim();
  return (
    entries.find(
      (e) =>
        e.visitorEmail.toLowerCase().trim() === normalized &&
        (e.status === "waiting" || e.status === "notified"),
    ) || null
  );
}

/**
 * Get the next person in line (status="waiting", lowest position) for a date
 */
export async function getNextWaitingEntry(
  tenantId: string,
  date: string,
): Promise<WaitlistEntry | null> {
  const entries = await getWaitlistByDate(tenantId, date);
  return entries.find((e) => e.status === "waiting") || null;
}

/**
 * Get all tenants + dates that have waiting entries (for cron).
 * Returns unique { tenantId, date } pairs.
 */
export async function getActiveWaitlistItems(): Promise<
  Array<{ tenantId: string; date: string; entryId: string }>
> {
  console.log("[DBG][waitlistRepository] Scanning for active waitlist items");

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression:
        "entityType = :entityType AND (#st = :waiting OR #st = :notified)",
      ExpressionAttributeValues: {
        ":entityType": EntityType.WAITLIST,
        ":waiting": "waiting",
        ":notified": "notified",
      },
      ExpressionAttributeNames: {
        "#st": "status",
        "#dt": "date",
      },
      ProjectionExpression: "tenantId, #dt, id, #st, expiresAt",
    }),
  );

  const items = (result.Items || []) as Array<{
    tenantId: string;
    date: string;
    id: string;
    status: string;
    expiresAt?: string;
  }>;

  console.log(
    `[DBG][waitlistRepository] Found ${items.length} active waitlist items`,
  );

  return items.map((item) => ({
    tenantId: item.tenantId,
    date: item.date,
    entryId: item.id,
  }));
}
