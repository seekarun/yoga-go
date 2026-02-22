/**
 * Webinar Waitlist Repository for CallyGo - DynamoDB Operations
 *
 * Storage pattern:
 * - PK="TENANT#{tenantId}", SK="WEBINAR_WAITLIST#{productId}#{entryId}"
 *
 * Queries:
 * - List by product: Query PK, SK begins_with "WEBINAR_WAITLIST#{productId}#"
 * - Get entry: GetItem PK + SK
 * - All waitlists (for cron): Scan entityType=WEBINAR_WAITLIST, status=waiting
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type { WebinarWaitlistEntry } from "@/types";

/**
 * DynamoDB item type (includes PK/SK keys)
 */
interface DynamoDBWebinarWaitlistItem extends WebinarWaitlistEntry {
  PK: string;
  SK: string;
  entityType: string;
}

/**
 * Strip DynamoDB keys from item to return clean WebinarWaitlistEntry
 */
function toWebinarWaitlistEntry(
  item: DynamoDBWebinarWaitlistItem,
): WebinarWaitlistEntry {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...entry } = item;
  return entry;
}

/**
 * Add a visitor to the webinar waitlist for a specific product.
 * Auto-assigns position based on existing entries.
 */
export async function addToWebinarWaitlist(
  tenantId: string,
  input: Omit<WebinarWaitlistEntry, "position" | "status" | "createdAt">,
): Promise<WebinarWaitlistEntry> {
  console.log(
    `[DBG][webinarWaitlistRepository] Adding ${input.visitorEmail} to webinar waitlist for product ${input.productId} (tenant ${tenantId})`,
  );

  // Count existing entries to determine position
  const existing = await getWebinarWaitlistByProduct(tenantId, input.productId);
  const position = existing.length + 1;

  const entry: WebinarWaitlistEntry = {
    ...input,
    position,
    status: "waiting",
    createdAt: new Date().toISOString(),
  };

  const item: DynamoDBWebinarWaitlistItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.WEBINAR_WAITLIST(input.productId, input.id),
    entityType: EntityType.WEBINAR_WAITLIST,
    ...entry,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    }),
  );

  console.log(
    `[DBG][webinarWaitlistRepository] Added to webinar waitlist at position ${position}`,
  );
  return entry;
}

/**
 * Get all webinar waitlist entries for a specific product, sorted by position
 */
export async function getWebinarWaitlistByProduct(
  tenantId: string,
  productId: string,
): Promise<WebinarWaitlistEntry[]> {
  console.log(
    `[DBG][webinarWaitlistRepository] Getting webinar waitlist for product ${productId} (tenant ${tenantId})`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.WEBINAR_WAITLIST_PRODUCT_PREFIX(productId),
      },
    }),
  );

  const entries = (result.Items || []).map((item) =>
    toWebinarWaitlistEntry(item as DynamoDBWebinarWaitlistItem),
  );

  // Sort by position ascending
  entries.sort((a, b) => a.position - b.position);

  console.log(
    `[DBG][webinarWaitlistRepository] Found ${entries.length} webinar waitlist entries for product ${productId}`,
  );
  return entries;
}

/**
 * Get a specific webinar waitlist entry
 */
export async function getWebinarWaitlistEntry(
  tenantId: string,
  productId: string,
  entryId: string,
): Promise<WebinarWaitlistEntry | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.WEBINAR_WAITLIST(productId, entryId),
      },
    }),
  );

  if (!result.Item) return null;
  return toWebinarWaitlistEntry(result.Item as DynamoDBWebinarWaitlistItem);
}

/**
 * Update a webinar waitlist entry (status, notifiedAt, expiresAt, bookedAt)
 */
export async function updateWebinarWaitlistEntry(
  tenantId: string,
  productId: string,
  entryId: string,
  updates: Partial<
    Pick<
      WebinarWaitlistEntry,
      "status" | "notifiedAt" | "expiresAt" | "bookedAt"
    >
  >,
): Promise<WebinarWaitlistEntry | null> {
  console.log(
    `[DBG][webinarWaitlistRepository] Updating entry ${entryId} for product ${productId}:`,
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
        SK: TenantPK.WEBINAR_WAITLIST(productId, entryId),
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
  return toWebinarWaitlistEntry(
    result.Attributes as DynamoDBWebinarWaitlistItem,
  );
}

/**
 * Find a webinar waitlist entry by email for a specific product (duplicate check)
 */
export async function getWebinarWaitlistByEmail(
  tenantId: string,
  productId: string,
  email: string,
): Promise<WebinarWaitlistEntry | null> {
  const entries = await getWebinarWaitlistByProduct(tenantId, productId);
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
 * Get the next person in line (status="waiting", lowest position) for a product
 */
export async function getNextWaitingWebinarEntry(
  tenantId: string,
  productId: string,
): Promise<WebinarWaitlistEntry | null> {
  const entries = await getWebinarWaitlistByProduct(tenantId, productId);
  return entries.find((e) => e.status === "waiting") || null;
}

/**
 * Get all tenants + products that have waiting entries (for cron).
 * Returns unique { tenantId, productId, entryId } tuples.
 */
export interface ActiveWebinarWaitlistItem {
  tenantId: string;
  productId: string;
  entryId: string;
  status: string;
  expiresAt?: string;
}

export async function getActiveWebinarWaitlistItems(): Promise<
  ActiveWebinarWaitlistItem[]
> {
  console.log(
    "[DBG][webinarWaitlistRepository] Scanning for active webinar waitlist items",
  );

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression:
        "entityType = :entityType AND (#st = :waiting OR #st = :notified)",
      ExpressionAttributeValues: {
        ":entityType": EntityType.WEBINAR_WAITLIST,
        ":waiting": "waiting",
        ":notified": "notified",
      },
      ExpressionAttributeNames: {
        "#st": "status",
      },
      ProjectionExpression: "tenantId, productId, id, #st, expiresAt",
    }),
  );

  const items = (result.Items || []) as Array<{
    tenantId: string;
    productId: string;
    id: string;
    status: string;
    expiresAt?: string;
  }>;

  console.log(
    `[DBG][webinarWaitlistRepository] Found ${items.length} active webinar waitlist items`,
  );

  return items.map((item) => ({
    tenantId: item.tenantId,
    productId: item.productId,
    entryId: item.id,
    status: item.status,
    expiresAt: item.expiresAt,
  }));
}
