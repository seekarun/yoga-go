/**
 * Calel Host Repository - DynamoDB Operations
 *
 * Hosts are people with calendars who can accept bookings.
 * Each host belongs to a tenant.
 *
 * Storage pattern:
 * - Primary: PK="HOST#{tenantId}", SK={hostId}
 * - Email lookup: GSI1PK="HOST#EMAIL#{email}", GSI1SK={hostId}
 * - External user lookup: GSI1PK="HOST#EXTERNAL#{externalUserId}", GSI1SK={hostId}
 * - Slug lookup: GSI1PK="HOST#SLUG#{tenantSlug}#{hostSlug}", GSI1SK={hostId}
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, Indexes, HostPK, EntityType } from "../dynamodb";
import type {
  CalendarHost,
  HostSettings,
  HostStatus,
  HostIntegrations,
} from "@yoga-go/calel-types";
import { randomBytes } from "crypto";

// Type for DynamoDB Host item (includes PK/SK and GSI keys)
interface DynamoDBHostItem extends CalendarHost {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  entityType: string;
}

// Type for creating a new host
export interface CreateHostInput {
  tenantId: string;
  tenantSlug: string; // Needed for slug lookup
  email: string;
  name: string;
  timezone: string;
  slug?: string;
  externalUserId?: string;
  avatarUrl?: string;
  bio?: string;
  settings?: Partial<HostSettings>;
}

// Type for updating a host
export interface UpdateHostInput {
  name?: string;
  timezone?: string;
  slug?: string;
  avatarUrl?: string;
  bio?: string;
  settings?: Partial<HostSettings>;
  status?: HostStatus;
}

/**
 * Generate a unique host ID
 */
function generateHostId(): string {
  return `host_${randomBytes(12).toString("hex")}`;
}

/**
 * Generate a URL-safe slug from name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);
}

/**
 * Convert DynamoDB item to CalendarHost type (removes PK/SK/GSI keys)
 */
function toHost(item: DynamoDBHostItem): CalendarHost {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, entityType, ...host } = item;
  return host as CalendarHost;
}

/**
 * Get host by ID
 */
export async function getHostById(
  tenantId: string,
  hostId: string,
): Promise<CalendarHost | null> {
  console.log(
    "[DBG][hostRepository] Getting host by id:",
    hostId,
    "tenantId:",
    tenantId,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: HostPK.HOST(tenantId),
        SK: hostId,
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][hostRepository] Host not found");
    return null;
  }

  console.log("[DBG][hostRepository] Found host:", hostId);
  return toHost(result.Item as DynamoDBHostItem);
}

/**
 * Get host by email (uses GSI1)
 */
export async function getHostByEmail(
  email: string,
): Promise<CalendarHost | null> {
  console.log("[DBG][hostRepository] Getting host by email:", email);

  const normalizedEmail = email.toLowerCase();

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: Indexes.GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": HostPK.EMAIL(normalizedEmail),
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][hostRepository] Host not found for email");
    return null;
  }

  console.log("[DBG][hostRepository] Found host for email:", email);
  return toHost(result.Items[0] as DynamoDBHostItem);
}

/**
 * Get host by external user ID (uses GSI1)
 * Used for linking to external systems (e.g., yoga-go user)
 */
export async function getHostByExternalUserId(
  externalUserId: string,
): Promise<CalendarHost | null> {
  console.log(
    "[DBG][hostRepository] Getting host by externalUserId:",
    externalUserId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: Indexes.GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": HostPK.EXTERNAL(externalUserId),
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][hostRepository] Host not found for externalUserId");
    return null;
  }

  console.log(
    "[DBG][hostRepository] Found host for externalUserId:",
    externalUserId,
  );
  return toHost(result.Items[0] as DynamoDBHostItem);
}

/**
 * Get host by slug (uses GSI1)
 * Requires tenant slug to form the lookup key
 */
export async function getHostBySlug(
  tenantSlug: string,
  hostSlug: string,
): Promise<CalendarHost | null> {
  console.log(
    "[DBG][hostRepository] Getting host by slug:",
    hostSlug,
    "tenantSlug:",
    tenantSlug,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: Indexes.GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": HostPK.SLUG(tenantSlug.toLowerCase(), hostSlug.toLowerCase()),
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][hostRepository] Host not found for slug");
    return null;
  }

  console.log("[DBG][hostRepository] Found host for slug:", hostSlug);
  return toHost(result.Items[0] as DynamoDBHostItem);
}

/**
 * Get all hosts for a tenant
 */
export async function getHostsByTenant(
  tenantId: string,
): Promise<CalendarHost[]> {
  console.log("[DBG][hostRepository] Getting hosts for tenant:", tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": HostPK.HOST(tenantId),
      },
    }),
  );

  const hosts = (result.Items || []).map((item) =>
    toHost(item as DynamoDBHostItem),
  );
  console.log("[DBG][hostRepository] Found", hosts.length, "hosts");
  return hosts;
}

/**
 * Get active hosts for a tenant
 */
export async function getActiveHostsByTenant(
  tenantId: string,
): Promise<CalendarHost[]> {
  console.log(
    "[DBG][hostRepository] Getting active hosts for tenant:",
    tenantId,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":pk": HostPK.HOST(tenantId),
        ":status": "active",
      },
    }),
  );

  const hosts = (result.Items || []).map((item) =>
    toHost(item as DynamoDBHostItem),
  );
  console.log("[DBG][hostRepository] Found", hosts.length, "active hosts");
  return hosts;
}

/**
 * Create a new host
 */
export async function createHost(
  input: CreateHostInput,
): Promise<CalendarHost> {
  const now = new Date().toISOString();
  const hostId = generateHostId();
  const slug = (input.slug || generateSlug(input.name)).toLowerCase();
  const email = input.email.toLowerCase();

  console.log("[DBG][hostRepository] Creating host:", hostId, "email:", email);

  // Check if email already exists
  const existingByEmail = await getHostByEmail(email);
  if (existingByEmail) {
    throw new Error(`Host with email "${email}" already exists`);
  }

  // Check if slug already exists for this tenant
  const existingBySlug = await getHostBySlug(input.tenantSlug, slug);
  if (existingBySlug) {
    throw new Error(`Host with slug "${slug}" already exists for this tenant`);
  }

  const defaultSettings: HostSettings = {
    bufferBefore: 0,
    bufferAfter: 0,
    minimumNotice: 24, // 24 hours
    maximumAdvance: 60, // 60 days
    defaultEventDuration: 30,
    ...input.settings,
  };

  // Determine GSI1PK based on available lookup keys
  // Priority: externalUserId > email
  let gsi1pk: string;
  if (input.externalUserId) {
    gsi1pk = HostPK.EXTERNAL(input.externalUserId);
  } else {
    gsi1pk = HostPK.EMAIL(email);
  }

  const item: DynamoDBHostItem = {
    PK: HostPK.HOST(input.tenantId),
    SK: hostId,
    GSI1PK: gsi1pk,
    GSI1SK: hostId,
    entityType: EntityType.HOST,
    id: hostId,
    tenantId: input.tenantId,
    externalUserId: input.externalUserId,
    email,
    name: input.name,
    timezone: input.timezone,
    slug,
    avatarUrl: input.avatarUrl,
    bio: input.bio,
    settings: defaultSettings,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );

  // Create additional lookup records for email and slug
  const lookupItems = [];

  // Email lookup (if not already primary GSI1PK)
  if (input.externalUserId) {
    lookupItems.push({
      PK: HostPK.EMAIL(email),
      SK: hostId,
      GSI1PK: HostPK.EMAIL(email),
      GSI1SK: hostId,
      hostId,
      tenantId: input.tenantId,
      entityType: "HOST_EMAIL_LOOKUP",
    });
  }

  // Slug lookup
  lookupItems.push({
    PK: HostPK.SLUG(input.tenantSlug.toLowerCase(), slug),
    SK: hostId,
    GSI1PK: HostPK.SLUG(input.tenantSlug.toLowerCase(), slug),
    GSI1SK: hostId,
    hostId,
    tenantId: input.tenantId,
    entityType: "HOST_SLUG_LOOKUP",
  });

  // Write lookup items
  for (const lookupItem of lookupItems) {
    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: lookupItem,
      }),
    );
  }

  console.log("[DBG][hostRepository] Created host:", hostId);
  return toHost(item);
}

/**
 * Update host
 */
export async function updateHost(
  tenantId: string,
  hostId: string,
  updates: UpdateHostInput,
): Promise<CalendarHost> {
  console.log("[DBG][hostRepository] Updating host:", hostId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      updateParts.push(`#k${index} = :v${index}`);
      exprAttrNames[`#k${index}`] = key;
      exprAttrValues[`:v${index}`] = value;
      index++;
    }
  }

  // Always update updatedAt
  updateParts.push("#updatedAt = :updatedAt");
  exprAttrNames["#updatedAt"] = "updatedAt";
  exprAttrValues[":updatedAt"] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: HostPK.HOST(tenantId),
        SK: hostId,
      },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log("[DBG][hostRepository] Updated host:", hostId);
  return toHost(result.Attributes as DynamoDBHostItem);
}

/**
 * Update host integrations (Zoom, Google, etc.)
 */
export async function updateHostIntegrations(
  tenantId: string,
  hostId: string,
  integrations: Partial<HostIntegrations>,
): Promise<CalendarHost> {
  console.log("[DBG][hostRepository] Updating host integrations:", hostId);

  const host = await getHostById(tenantId, hostId);
  if (!host) {
    throw new Error(`Host not found: ${hostId}`);
  }

  const updatedIntegrations: HostIntegrations = {
    ...host.integrations,
    ...integrations,
  };

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: HostPK.HOST(tenantId),
        SK: hostId,
      },
      UpdateExpression:
        "SET integrations = :integrations, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":integrations": updatedIntegrations,
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log("[DBG][hostRepository] Updated host integrations:", hostId);
  return toHost(result.Attributes as DynamoDBHostItem);
}

/**
 * Update host status
 */
export async function updateHostStatus(
  tenantId: string,
  hostId: string,
  status: HostStatus,
): Promise<CalendarHost> {
  return updateHost(tenantId, hostId, { status });
}

/**
 * Delete host
 * Note: Should also delete all availability, event types, bookings associated with host
 */
export async function deleteHost(
  tenantId: string,
  hostId: string,
): Promise<void> {
  console.log("[DBG][hostRepository] Deleting host:", hostId);

  const host = await getHostById(tenantId, hostId);
  if (!host) {
    console.log("[DBG][hostRepository] Host not found, nothing to delete");
    return;
  }

  // Delete lookup records
  // Email lookup
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: HostPK.EMAIL(host.email),
        SK: hostId,
      },
    }),
  );

  // External user lookup (if exists)
  if (host.externalUserId) {
    await docClient.send(
      new DeleteCommand({
        TableName: Tables.CORE,
        Key: {
          PK: HostPK.EXTERNAL(host.externalUserId),
          SK: hostId,
        },
      }),
    );
  }

  // Delete host
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: HostPK.HOST(tenantId),
        SK: hostId,
      },
    }),
  );

  console.log("[DBG][hostRepository] Deleted host:", hostId);
  // TODO: Delete all associated availability, event types, bookings
}
