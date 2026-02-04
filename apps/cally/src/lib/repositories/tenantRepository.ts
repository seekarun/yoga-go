/**
 * Tenant Repository for Cally - DynamoDB Operations
 *
 * Storage pattern:
 * - Primary: PK="TENANT#{tenantId}", SK="META"
 * - User lookup: GSI1PK="USER#{cognitoSub}", GSI1SK="TENANT#{tenantId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, Indexes, TenantPK, EntityType } from "../dynamodb";
import type { SimpleLandingPageConfig } from "@/types/landing-page";
import { DEFAULT_LANDING_PAGE_CONFIG } from "@/types/landing-page";
import type { DomainConfig, EmailConfig } from "@/types/domain";
import type { AiAssistantConfig } from "@/types/ai-assistant";

/**
 * Cally Tenant Entity
 * Simplified tenant for landing pages and calendar
 */
export interface CallyTenant {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  draftLandingPage?: SimpleLandingPageConfig;
  customLandingPage?: SimpleLandingPageConfig;
  isLandingPagePublished?: boolean;
  domainConfig?: DomainConfig;
  emailConfig?: EmailConfig;
  aiAssistantConfig?: AiAssistantConfig;
  createdAt: string;
  updatedAt: string;
}

/**
 * DynamoDB item type (includes PK/SK/GSI keys)
 */
interface DynamoDBTenantItem extends CallyTenant {
  PK: string;
  SK: string;
  GSI1PK: string;
  GSI1SK: string;
  entityType: string;
}

/**
 * Input for creating a new tenant
 */
export interface CreateTenantInput {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
}

/**
 * Convert DynamoDB item to CallyTenant (removes PK/SK/GSI)
 */
function toTenant(item: DynamoDBTenantItem): CallyTenant {
  const {
    PK: _pk,
    SK: _sk,
    GSI1PK: _gsi1pk,
    GSI1SK: _gsi1sk,
    entityType: _et,
    ...tenant
  } = item;
  return tenant as CallyTenant;
}

// ===================================================================
// CORE CRUD OPERATIONS
// ===================================================================

/**
 * Get tenant by ID
 * PK: TENANT#{tenantId}, SK: META
 */
export async function getTenantById(
  tenantId: string,
): Promise<CallyTenant | null> {
  console.log("[DBG][tenantRepository] Getting tenant by id:", tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
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
 * Get tenant by user ID (cognitoSub)
 * Uses GSI1: GSI1PK=USER#{cognitoSub}
 */
export async function getTenantByUserId(
  userId: string,
): Promise<CallyTenant | null> {
  console.log("[DBG][tenantRepository] Getting tenant by userId:", userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: Indexes.GSI1,
      KeyConditionExpression: "GSI1PK = :gsi1pk",
      ExpressionAttributeValues: {
        ":gsi1pk": TenantPK.USER_GSI1PK(userId),
      },
      Limit: 1,
    }),
  );

  if (!result.Items || result.Items.length === 0) {
    console.log("[DBG][tenantRepository] Tenant not found for userId");
    return null;
  }

  console.log("[DBG][tenantRepository] Found tenant for userId:", userId);
  return toTenant(result.Items[0] as DynamoDBTenantItem);
}

/**
 * Create a new tenant
 * PK=TENANT#{id}, SK=META
 * GSI1PK=USER#{userId}, GSI1SK=TENANT#{id}
 */
export async function createTenant(
  input: CreateTenantInput,
): Promise<CallyTenant> {
  const now = new Date().toISOString();

  console.log(
    "[DBG][tenantRepository] Creating tenant:",
    input.id,
    "for user:",
    input.userId,
  );

  const tenant: DynamoDBTenantItem = {
    PK: TenantPK.TENANT(input.id),
    SK: TenantPK.META,
    GSI1PK: TenantPK.USER_GSI1PK(input.userId),
    GSI1SK: TenantPK.TENANT_GSI1SK(input.id),
    entityType: EntityType.TENANT,
    id: input.id,
    userId: input.userId,
    name: input.name,
    email: input.email,
    avatar: input.avatar,
    isLandingPagePublished: false,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: tenant,
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );

  console.log("[DBG][tenantRepository] Created tenant:", input.id);
  return toTenant(tenant);
}

/**
 * Update tenant - partial update using UpdateCommand
 */
export async function updateTenant(
  tenantId: string,
  updates: Partial<CallyTenant>,
): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Updating tenant:", tenantId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    // Skip immutable fields
    if (
      value !== undefined &&
      !["id", "userId", "PK", "SK", "GSI1PK", "GSI1SK"].includes(key)
    ) {
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

  try {
    console.log(
      "[DBG][tenantRepository] Update expression:",
      `SET ${updateParts.join(", ")}`,
    );
    console.log(
      "[DBG][tenantRepository] Attr names:",
      JSON.stringify(exprAttrNames),
    );

    const result = await docClient.send(
      new UpdateCommand({
        TableName: Tables.CORE,
        Key: {
          PK: TenantPK.TENANT(tenantId),
          SK: TenantPK.META,
        },
        UpdateExpression: `SET ${updateParts.join(", ")}`,
        ExpressionAttributeNames: exprAttrNames,
        ExpressionAttributeValues: exprAttrValues,
        ReturnValues: "ALL_NEW",
      }),
    );

    console.log("[DBG][tenantRepository] Updated tenant:", tenantId);
    return toTenant(result.Attributes as DynamoDBTenantItem);
  } catch (error) {
    console.error("[DBG][tenantRepository] DynamoDB update error:", error);
    throw error;
  }
}

// ===================================================================
// LANDING PAGE OPERATIONS
// ===================================================================

/**
 * Update draft landing page config
 * Uses PutCommand to avoid UpdateCommand size limits on ExpressionAttributeValues
 */
export async function updateDraftLandingPage(
  tenantId: string,
  draftLandingPage: SimpleLandingPageConfig,
): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Updating draft landing page:", tenantId);
  console.log(
    "[DBG][tenantRepository] Draft config keys:",
    Object.keys(draftLandingPage),
  );

  try {
    // Fetch current tenant
    const tenant = await getTenantById(tenantId);
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    const now = new Date().toISOString();

    // Create the full item with updated draft
    const updatedItem: DynamoDBTenantItem = {
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.META,
      GSI1PK: TenantPK.USER_GSI1PK(tenant.userId),
      GSI1SK: TenantPK.TENANT_GSI1SK(tenantId),
      entityType: EntityType.TENANT,
      id: tenant.id,
      userId: tenant.userId,
      name: tenant.name,
      email: tenant.email,
      avatar: tenant.avatar,
      draftLandingPage: draftLandingPage,
      customLandingPage: tenant.customLandingPage,
      isLandingPagePublished: tenant.isLandingPagePublished,
      domainConfig: tenant.domainConfig,
      emailConfig: tenant.emailConfig,
      aiAssistantConfig: tenant.aiAssistantConfig,
      createdAt: tenant.createdAt,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: updatedItem,
      }),
    );

    console.log("[DBG][tenantRepository] Draft updated for tenant:", tenantId);
    return toTenant(updatedItem);
  } catch (error) {
    console.error("[DBG][tenantRepository] Error updating draft:", error);
    throw error;
  }
}

/**
 * Publish landing page
 * Copies draftLandingPage to customLandingPage
 * Uses PutCommand to avoid UpdateCommand size limits
 */
export async function publishLandingPage(
  tenantId: string,
): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Publishing landing page:", tenantId);

  // Get current tenant to access draft
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // If no draft exists, use the current customLandingPage or default
  const landingPageToPublish =
    tenant.draftLandingPage ||
    tenant.customLandingPage ||
    DEFAULT_LANDING_PAGE_CONFIG;

  const now = new Date().toISOString();

  // Create the full item with published landing page
  const updatedItem: DynamoDBTenantItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.META,
    GSI1PK: TenantPK.USER_GSI1PK(tenant.userId),
    GSI1SK: TenantPK.TENANT_GSI1SK(tenantId),
    entityType: EntityType.TENANT,
    id: tenant.id,
    userId: tenant.userId,
    name: tenant.name,
    email: tenant.email,
    avatar: tenant.avatar,
    draftLandingPage: tenant.draftLandingPage,
    customLandingPage: landingPageToPublish,
    isLandingPagePublished: true,
    domainConfig: tenant.domainConfig,
    emailConfig: tenant.emailConfig,
    aiAssistantConfig: tenant.aiAssistantConfig,
    createdAt: tenant.createdAt,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: updatedItem,
    }),
  );

  console.log(
    "[DBG][tenantRepository] Published landing page for tenant:",
    tenantId,
  );
  return toTenant(updatedItem);
}

/**
 * Discard draft landing page changes
 * Copies customLandingPage (published) to draftLandingPage
 */
export async function discardDraftLandingPage(
  tenantId: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Discarding draft landing page:",
    tenantId,
  );

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  return updateTenant(tenantId, {
    draftLandingPage: tenant.customLandingPage || DEFAULT_LANDING_PAGE_CONFIG,
  });
}

// ===================================================================
// DOMAIN & EMAIL OPERATIONS
// ===================================================================

/**
 * Update domain configuration
 */
export async function updateDomainConfig(
  tenantId: string,
  domainConfig: DomainConfig | undefined,
): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Updating domain config:", tenantId);

  return updateTenant(tenantId, { domainConfig });
}

/**
 * Update email configuration
 */
export async function updateEmailConfig(
  tenantId: string,
  emailConfig: EmailConfig | undefined,
): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Updating email config:", tenantId);

  return updateTenant(tenantId, { emailConfig });
}

/**
 * Clear domain and email configuration (when removing domain)
 */
export async function clearDomainAndEmailConfig(
  tenantId: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Clearing domain and email config:",
    tenantId,
  );

  // Fetch current tenant
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const now = new Date().toISOString();

  // Create the full item without domain/email config
  const updatedItem: DynamoDBTenantItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.META,
    GSI1PK: TenantPK.USER_GSI1PK(tenant.userId),
    GSI1SK: TenantPK.TENANT_GSI1SK(tenantId),
    entityType: EntityType.TENANT,
    id: tenant.id,
    userId: tenant.userId,
    name: tenant.name,
    email: tenant.email,
    avatar: tenant.avatar,
    draftLandingPage: tenant.draftLandingPage,
    customLandingPage: tenant.customLandingPage,
    isLandingPagePublished: tenant.isLandingPagePublished,
    // Intentionally omit domainConfig and emailConfig
    aiAssistantConfig: tenant.aiAssistantConfig,
    createdAt: tenant.createdAt,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: updatedItem,
    }),
  );

  console.log(
    "[DBG][tenantRepository] Cleared domain/email config for tenant:",
    tenantId,
  );
  return toTenant(updatedItem);
}
