/**
 * Calel Tenant Repository - DynamoDB Operations
 *
 * Tenants represent service accounts (organizations/businesses) that use Calel.
 * Each tenant can have multiple hosts (people with calendars).
 *
 * Storage pattern:
 * - Primary: PK="TENANT", SK={tenantId}
 * - Slug lookup: GSI1PK="TENANT#SLUG#{slug}", GSI1SK={tenantId}
 * - API Key lookup: GSI1PK="APIKEY#{prefix}", GSI1SK={tenantId}
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, Indexes, TenantPK, EntityType } from "../dynamodb";
import type {
  CalendarTenant,
  TenantSettings,
  TenantStatus,
} from "@yoga-go/calel-types";
import { createHash, randomBytes } from "crypto";

// Type for DynamoDB Tenant item (includes PK/SK and GSI keys)
interface DynamoDBTenantItem extends CalendarTenant {
  PK: string;
  SK: string;
  GSI1PK?: string;
  GSI1SK?: string;
  entityType: string;
}

// Type for creating a new tenant
export interface CreateTenantInput {
  name: string;
  slug: string;
  settings?: Partial<TenantSettings>;
}

// Type for API key result
export interface ApiKeyResult {
  apiKey: string; // Full API key (only returned on creation)
  prefix: string;
}

/**
 * Generate a unique tenant ID
 */
function generateTenantId(): string {
  return `ten_${randomBytes(12).toString("hex")}`;
}

/**
 * Generate an API key with prefix
 */
function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = `ck_${randomBytes(4).toString("hex")}`;
  const secret = randomBytes(24).toString("hex");
  const key = `${prefix}_${secret}`;
  const hash = createHash("sha256").update(key).digest("hex");
  return { key, prefix, hash };
}

/**
 * Convert DynamoDB item to CalendarTenant type (removes PK/SK/GSI keys)
 */
function toTenant(item: DynamoDBTenantItem): CalendarTenant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, GSI1PK, GSI1SK, entityType, ...tenant } = item;
  return tenant as CalendarTenant;
}

/**
 * Get tenant by ID
 */
export async function getTenantById(
  tenantId: string,
): Promise<CalendarTenant | null> {
  console.log("[DBG][tenantRepository] Getting tenant by id:", tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT,
        SK: tenantId,
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][tenantRepository] Tenant not found");
    return null;
  }

  console.log("[DBG][tenantRepository] Found tenant:", tenantId);
  return toTenant(result.Item as DynamoDBTenantItem);
}

/**
 * Get tenant by slug (uses GSI1)
 */
export async function getTenantBySlug(
  slug: string,
): Promise<CalendarTenant | null> {
  console.log("[DBG][tenantRepository] Getting tenant by slug:", slug);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: Indexes.GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": TenantPK.SLUG(slug.toLowerCase()),
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][tenantRepository] Tenant not found for slug");
    return null;
  }

  console.log("[DBG][tenantRepository] Found tenant for slug:", slug);
  return toTenant(result.Items[0] as DynamoDBTenantItem);
}

/**
 * Get tenant by API key prefix (uses GSI1)
 * Returns tenant if API key hash matches
 */
export async function getTenantByApiKey(
  apiKey: string,
): Promise<CalendarTenant | null> {
  console.log("[DBG][tenantRepository] Getting tenant by API key");

  // Extract prefix from API key (format: ck_xxxxxxxx_...)
  const parts = apiKey.split("_");
  if (parts.length < 3) {
    console.log("[DBG][tenantRepository] Invalid API key format");
    return null;
  }
  const prefix = `${parts[0]}_${parts[1]}`;

  // Look up by prefix
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: Indexes.GSI1,
      KeyConditionExpression: "GSI1PK = :pk",
      ExpressionAttributeValues: {
        ":pk": TenantPK.API_KEY(prefix),
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][tenantRepository] Tenant not found for API key prefix");
    return null;
  }

  const item = result.Items[0] as DynamoDBTenantItem;

  // Verify full API key hash
  const hash = createHash("sha256").update(apiKey).digest("hex");
  if (hash !== item.apiKey) {
    console.log("[DBG][tenantRepository] API key hash mismatch");
    return null;
  }

  console.log("[DBG][tenantRepository] Found tenant for API key");
  return toTenant(item);
}

/**
 * Get all tenants
 */
export async function getAllTenants(): Promise<CalendarTenant[]> {
  console.log("[DBG][tenantRepository] Getting all tenants");

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT,
      },
    }),
  );

  const tenants = (result.Items || []).map((item) =>
    toTenant(item as DynamoDBTenantItem),
  );
  console.log("[DBG][tenantRepository] Found", tenants.length, "tenants");
  return tenants;
}

/**
 * Create a new tenant with API key
 * Returns the full API key (only available at creation time)
 */
export async function createTenant(
  input: CreateTenantInput,
): Promise<{ tenant: CalendarTenant; apiKey: string }> {
  const now = new Date().toISOString();
  const tenantId = generateTenantId();
  const { key: apiKey, prefix, hash: apiKeyHash } = generateApiKey();
  const slug = input.slug.toLowerCase();

  console.log(
    "[DBG][tenantRepository] Creating tenant:",
    tenantId,
    "name:",
    input.name,
  );

  // Check if slug already exists
  const existingTenant = await getTenantBySlug(slug);
  if (existingTenant) {
    throw new Error(`Tenant with slug "${slug}" already exists`);
  }

  const defaultSettings: TenantSettings = {
    defaultTimezone: "UTC",
    allowPublicBooking: true,
    requireEmailVerification: false,
    ...input.settings,
  };

  const item: DynamoDBTenantItem = {
    PK: TenantPK.TENANT,
    SK: tenantId,
    GSI1PK: TenantPK.SLUG(slug),
    GSI1SK: tenantId,
    entityType: EntityType.TENANT,
    id: tenantId,
    name: input.name,
    slug,
    apiKey: apiKeyHash,
    apiKeyPrefix: prefix,
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

  // Also create API key lookup record
  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: TenantPK.API_KEY(prefix),
        SK: tenantId,
        GSI1PK: TenantPK.API_KEY(prefix),
        GSI1SK: tenantId,
        tenantId,
        apiKeyHash,
        entityType: "API_KEY_LOOKUP",
      },
    }),
  );

  console.log("[DBG][tenantRepository] Created tenant:", tenantId);
  return { tenant: toTenant(item), apiKey };
}

/**
 * Rotate API key for a tenant
 * Returns new API key (only available at rotation time)
 */
export async function rotateApiKey(tenantId: string): Promise<ApiKeyResult> {
  console.log("[DBG][tenantRepository] Rotating API key for tenant:", tenantId);

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const oldPrefix = tenant.apiKeyPrefix;
  const { key: newApiKey, prefix: newPrefix, hash: newHash } = generateApiKey();

  // Delete old API key lookup
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.API_KEY(oldPrefix),
        SK: tenantId,
      },
    }),
  );

  // Update tenant with new API key
  await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT,
        SK: tenantId,
      },
      UpdateExpression:
        "SET apiKey = :hash, apiKeyPrefix = :prefix, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":hash": newHash,
        ":prefix": newPrefix,
        ":updatedAt": new Date().toISOString(),
      },
    }),
  );

  // Create new API key lookup
  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: TenantPK.API_KEY(newPrefix),
        SK: tenantId,
        GSI1PK: TenantPK.API_KEY(newPrefix),
        GSI1SK: tenantId,
        tenantId,
        apiKeyHash: newHash,
        entityType: "API_KEY_LOOKUP",
      },
    }),
  );

  console.log("[DBG][tenantRepository] Rotated API key for tenant:", tenantId);
  return { apiKey: newApiKey, prefix: newPrefix };
}

/**
 * Update tenant
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<Pick<CalendarTenant, "name" | "settings" | "status">>,
): Promise<CalendarTenant> {
  console.log("[DBG][tenantRepository] Updating tenant:", tenantId);

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
        PK: TenantPK.TENANT,
        SK: tenantId,
      },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log("[DBG][tenantRepository] Updated tenant:", tenantId);
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

/**
 * Update tenant status
 */
export async function updateTenantStatus(
  tenantId: string,
  status: TenantStatus,
): Promise<CalendarTenant> {
  return updateTenant(tenantId, { status });
}

/**
 * Delete tenant
 * Note: Should also delete all hosts, event types, bookings etc. associated with tenant
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  console.log("[DBG][tenantRepository] Deleting tenant:", tenantId);

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.log("[DBG][tenantRepository] Tenant not found, nothing to delete");
    return;
  }

  // Delete API key lookup
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.API_KEY(tenant.apiKeyPrefix),
        SK: tenantId,
      },
    }),
  );

  // Delete tenant
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT,
        SK: tenantId,
      },
    }),
  );

  console.log("[DBG][tenantRepository] Deleted tenant:", tenantId);
  // TODO: Delete all associated hosts, event types, bookings, webhooks
}

/**
 * Get active tenants
 */
export async function getActiveTenants(): Promise<CalendarTenant[]> {
  console.log("[DBG][tenantRepository] Getting active tenants");

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk",
      FilterExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT,
        ":status": "active",
      },
    }),
  );

  const tenants = (result.Items || []).map((item) =>
    toTenant(item as DynamoDBTenantItem),
  );
  console.log(
    "[DBG][tenantRepository] Found",
    tenants.length,
    "active tenants",
  );
  return tenants;
}
