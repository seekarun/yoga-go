/**
 * Tenant Repository for CallyGo - DynamoDB Operations
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
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  docClient,
  Tables,
  Indexes,
  TenantPK,
  EntityType,
  DomainLookupPK,
} from "../dynamodb";
import type { SimpleLandingPageConfig } from "@/types/landing-page";
import { DEFAULT_LANDING_PAGE_CONFIG } from "@/types/landing-page";
import type { DomainConfig, EmailConfig } from "@/types/domain";
import type { AiAssistantConfig } from "@/types/ai-assistant";
import type { PhoneConfig } from "@/types/phone-calling";
import type { BookingConfig } from "@/types/booking";
import type { GoogleCalendarConfig } from "@/types/google-calendar";
import type { ZoomConfig } from "@/types/zoom";
import type { OutlookCalendarConfig } from "@/types/outlook-calendar";
import type { StripeConfig } from "@/types/stripe";
import type { SubscriptionConfig } from "@/types/subscription";
import type { GoogleBusinessConfig } from "@/types/google-business";

/**
 * CallyGo Tenant Entity
 * Simplified tenant for landing pages and calendar
 */
export interface CallyTenant {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  logo?: string;
  draftLandingPage?: SimpleLandingPageConfig;
  customLandingPage?: SimpleLandingPageConfig;
  isLandingPagePublished?: boolean;
  domainConfig?: DomainConfig;
  additionalDomains?: DomainConfig[];
  emailConfig?: EmailConfig;
  aiAssistantConfig?: AiAssistantConfig;
  phoneConfig?: PhoneConfig;
  bookingConfig?: BookingConfig;
  googleCalendarConfig?: GoogleCalendarConfig;
  zoomConfig?: ZoomConfig;
  outlookCalendarConfig?: OutlookCalendarConfig;
  stripeConfig?: StripeConfig;
  subscriptionConfig?: SubscriptionConfig;
  googleBusinessConfig?: GoogleBusinessConfig;
  videoCallPreference?: "cally" | "google_meet" | "zoom";
  emailDisplayName?: string;
  timezone?: string;
  defaultEventDuration?: number;
  currency?: string;
  address?: string;
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
  logo?: string;
  timezone?: string;
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
    ...(input.timezone ? { timezone: input.timezone } : {}),
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

    // Create the full item with updated draft — spread all existing fields
    // so newly-added tenant properties are never accidentally dropped
    const updatedItem: DynamoDBTenantItem = {
      ...tenant,
      PK: TenantPK.TENANT(tenantId),
      SK: TenantPK.META,
      GSI1PK: TenantPK.USER_GSI1PK(tenant.userId),
      GSI1SK: TenantPK.TENANT_GSI1SK(tenantId),
      entityType: EntityType.TENANT,
      draftLandingPage: draftLandingPage,
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

  // Create the full item with published landing page — spread all existing
  // fields so newly-added tenant properties are never accidentally dropped
  const updatedItem: DynamoDBTenantItem = {
    ...tenant,
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.META,
    GSI1PK: TenantPK.USER_GSI1PK(tenant.userId),
    GSI1SK: TenantPK.TENANT_GSI1SK(tenantId),
    entityType: EntityType.TENANT,
    customLandingPage: landingPageToPublish,
    isLandingPagePublished: true,
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
 * Add an additional domain to the tenant's additionalDomains array
 */
export async function addAdditionalDomain(
  tenantId: string,
  domainConfig: DomainConfig,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Adding additional domain:",
    domainConfig.domain,
    "for tenant:",
    tenantId,
  );

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const existing = tenant.additionalDomains || [];
  const updated = [...existing, domainConfig];

  return updateTenant(tenantId, { additionalDomains: updated });
}

/**
 * Update an additional domain in the tenant's additionalDomains array
 */
export async function updateAdditionalDomain(
  tenantId: string,
  domain: string,
  updates: Partial<DomainConfig>,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Updating additional domain:",
    domain,
    "for tenant:",
    tenantId,
  );

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const existing = tenant.additionalDomains || [];
  const updated = existing.map((d) =>
    d.domain === domain ? { ...d, ...updates } : d,
  );

  return updateTenant(tenantId, { additionalDomains: updated });
}

/**
 * Remove an additional domain from the tenant's additionalDomains array
 */
export async function removeAdditionalDomain(
  tenantId: string,
  domain: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Removing additional domain:",
    domain,
    "for tenant:",
    tenantId,
  );

  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error("Tenant not found");
  }

  const existing = tenant.additionalDomains || [];
  const updated = existing.filter((d) => d.domain !== domain);

  return updateTenant(tenantId, {
    additionalDomains: updated.length > 0 ? updated : [],
  });
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

  // Create the full item without domain/email config but preserve additionalDomains
  // Spread all existing fields so newly-added tenant properties are never dropped
  const {
    domainConfig: _dc,
    emailConfig: _ec,
    ...tenantWithoutDomainEmail
  } = tenant;
  const updatedItem: DynamoDBTenantItem = {
    ...tenantWithoutDomainEmail,
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.META,
    GSI1PK: TenantPK.USER_GSI1PK(tenant.userId),
    GSI1SK: TenantPK.TENANT_GSI1SK(tenantId),
    entityType: EntityType.TENANT,
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

// ===================================================================
// GOOGLE CALENDAR OPERATIONS
// ===================================================================

/**
 * Remove Google Calendar config from tenant (uses DynamoDB REMOVE)
 */
export async function removeGoogleCalendarConfig(
  tenantId: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Removing Google Calendar config:",
    tenantId,
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
      },
      UpdateExpression: "REMOVE #gcConfig SET #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#gcConfig": "googleCalendarConfig",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log(
    "[DBG][tenantRepository] Removed Google Calendar config for:",
    tenantId,
  );
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// GOOGLE BUSINESS PROFILE OPERATIONS
// ===================================================================

/**
 * Remove Google Business config from tenant (uses DynamoDB REMOVE)
 */
export async function removeGoogleBusinessConfig(
  tenantId: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Removing Google Business config:",
    tenantId,
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
      },
      UpdateExpression: "REMOVE #gbConfig SET #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#gbConfig": "googleBusinessConfig",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log(
    "[DBG][tenantRepository] Removed Google Business config for:",
    tenantId,
  );
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// ZOOM OPERATIONS
// ===================================================================

/**
 * Remove Zoom config from tenant (uses DynamoDB REMOVE)
 */
export async function removeZoomConfig(tenantId: string): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Removing Zoom config:", tenantId);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
      },
      UpdateExpression: "REMOVE #zoomConfig SET #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#zoomConfig": "zoomConfig",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log("[DBG][tenantRepository] Removed Zoom config for:", tenantId);
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// OUTLOOK CALENDAR OPERATIONS
// ===================================================================

/**
 * Remove Outlook Calendar config from tenant (uses DynamoDB REMOVE)
 */
export async function removeOutlookCalendarConfig(
  tenantId: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Removing Outlook Calendar config:",
    tenantId,
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
      },
      UpdateExpression: "REMOVE #ocConfig SET #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#ocConfig": "outlookCalendarConfig",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log(
    "[DBG][tenantRepository] Removed Outlook Calendar config for:",
    tenantId,
  );
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// STRIPE OPERATIONS
// ===================================================================

/**
 * Remove Stripe config from tenant (uses DynamoDB REMOVE)
 */
export async function removeStripeConfig(
  tenantId: string,
): Promise<CallyTenant> {
  console.log("[DBG][tenantRepository] Removing Stripe config:", tenantId);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
      },
      UpdateExpression: "REMOVE #stripeConfig SET #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#stripeConfig": "stripeConfig",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log("[DBG][tenantRepository] Removed Stripe config for:", tenantId);
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// SUBSCRIPTION OPERATIONS
// ===================================================================

/**
 * Remove subscription config from tenant (uses DynamoDB REMOVE)
 */
export async function removeSubscriptionConfig(
  tenantId: string,
): Promise<CallyTenant> {
  console.log(
    "[DBG][tenantRepository] Removing subscription config:",
    tenantId,
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.META,
      },
      UpdateExpression: "REMOVE #subConfig SET #updatedAt = :updatedAt",
      ExpressionAttributeNames: {
        "#subConfig": "subscriptionConfig",
        "#updatedAt": "updatedAt",
      },
      ExpressionAttributeValues: {
        ":updatedAt": new Date().toISOString(),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  console.log(
    "[DBG][tenantRepository] Removed subscription config for:",
    tenantId,
  );
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// DOMAIN LOOKUP OPERATIONS (yoga-go-core table for SES Lambda)
// ===================================================================

/**
 * Email config for domain lookup (subset needed by SES Lambda)
 */
interface DomainLookupEmailConfig {
  domainEmail: string;
  forwardToEmail?: string;
  forwardingEnabled: boolean;
  sesVerificationStatus: string;
  forwardToCal?: boolean;
}

/**
 * Create domain lookup records in yoga-go-core table
 * This allows the SES email-forwarder Lambda to find cally tenants
 *
 * Creates two records:
 * 1. Domain lookup: PK=TENANT#DOMAIN#{domain}, SK={domain} - for domain->tenant mapping
 * 2. Tenant reference: PK=TENANT, SK={tenantId} - for tenant data with emailConfig
 */
export async function createDomainLookup(
  domain: string,
  tenantId: string,
  emailConfig?: DomainLookupEmailConfig,
): Promise<void> {
  const normalizedDomain = domain.toLowerCase();
  const now = new Date().toISOString();

  console.log(
    "[DBG][tenantRepository] Creating domain lookup:",
    normalizedDomain,
    "for tenant:",
    tenantId,
  );

  // 1. Create domain lookup record (domain -> tenantId mapping)
  await docClient.send(
    new PutCommand({
      TableName: Tables.YOGA_CORE,
      Item: {
        PK: DomainLookupPK.DOMAIN(normalizedDomain),
        SK: normalizedDomain,
        tenantId: tenantId,
        expertId: tenantId, // SES Lambda uses expertId
        domain: normalizedDomain,
        app: "cally",
        createdAt: now,
      },
    }),
  );

  console.log(
    "[DBG][tenantRepository] Created domain lookup for:",
    normalizedDomain,
  );

  // 2. Create tenant reference record (for Lambda to get emailConfig)
  // Lambda expects: PK=TENANT, SK=tenantId with emailConfig embedded
  if (emailConfig) {
    await docClient.send(
      new PutCommand({
        TableName: Tables.YOGA_CORE,
        Item: {
          PK: "TENANT",
          SK: tenantId,
          id: tenantId,
          expertId: tenantId,
          primaryDomain: normalizedDomain,
          app: "cally",
          emailConfig: {
            domainEmail: emailConfig.domainEmail,
            forwardToEmail: emailConfig.forwardToEmail,
            forwardingEnabled: emailConfig.forwardingEnabled,
            sesVerificationStatus: emailConfig.sesVerificationStatus,
            forwardToCal: emailConfig.forwardToCal ?? true,
          },
          createdAt: now,
          updatedAt: now,
        },
      }),
    );

    console.log(
      "[DBG][tenantRepository] Created tenant reference for:",
      tenantId,
    );
  }
}

/**
 * Update forwardToCal flag on the domain lookup tenant reference in yoga-go-core
 * This keeps the SES Lambda in sync when the flag is toggled
 */
export async function updateDomainLookupForwardToCal(
  tenantId: string,
  forwardToCal: boolean,
): Promise<void> {
  console.log(
    "[DBG][tenantRepository] Updating forwardToCal in domain lookup:",
    tenantId,
    "->",
    forwardToCal,
  );

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.YOGA_CORE,
      Key: {
        PK: "TENANT",
        SK: tenantId,
      },
      UpdateExpression:
        "SET emailConfig.forwardToCal = :forwardToCal, updatedAt = :now",
      ExpressionAttributeValues: {
        ":forwardToCal": forwardToCal,
        ":now": new Date().toISOString(),
      },
    }),
  );

  console.log(
    "[DBG][tenantRepository] Updated forwardToCal in domain lookup:",
    tenantId,
  );
}

/**
 * Update forwardToEmail on the domain lookup tenant reference in yoga-go-core
 * This keeps the SES Lambda in sync when the forwarding address is changed
 */
export async function updateDomainLookupForwardToEmail(
  tenantId: string,
  forwardToEmail: string,
): Promise<void> {
  console.log(
    "[DBG][tenantRepository] Updating forwardToEmail in domain lookup:",
    tenantId,
    "->",
    forwardToEmail,
  );

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.YOGA_CORE,
      Key: {
        PK: "TENANT",
        SK: tenantId,
      },
      UpdateExpression:
        "SET emailConfig.forwardToEmail = :forwardToEmail, updatedAt = :now",
      ExpressionAttributeValues: {
        ":forwardToEmail": forwardToEmail,
        ":now": new Date().toISOString(),
      },
    }),
  );

  console.log(
    "[DBG][tenantRepository] Updated forwardToEmail in domain lookup:",
    tenantId,
  );
}

/**
 * Delete domain lookup records from yoga-go-core table
 * Deletes both the domain lookup and the tenant reference
 */
export async function deleteDomainLookup(
  domain: string,
  tenantId?: string,
): Promise<void> {
  const normalizedDomain = domain.toLowerCase();
  console.log(
    "[DBG][tenantRepository] Deleting domain lookup:",
    normalizedDomain,
  );

  // 1. Delete domain lookup record
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.YOGA_CORE,
      Key: {
        PK: DomainLookupPK.DOMAIN(normalizedDomain),
        SK: normalizedDomain,
      },
    }),
  );

  console.log(
    "[DBG][tenantRepository] Deleted domain lookup for:",
    normalizedDomain,
  );

  // 2. Delete tenant reference record if tenantId provided
  if (tenantId) {
    await docClient.send(
      new DeleteCommand({
        TableName: Tables.YOGA_CORE,
        Key: {
          PK: "TENANT",
          SK: tenantId,
        },
      }),
    );

    console.log(
      "[DBG][tenantRepository] Deleted tenant reference for:",
      tenantId,
    );
  }
}

/**
 * Get domain lookup record from yoga-go-core table
 */
export async function getDomainLookup(
  domain: string,
): Promise<{ tenantId: string; expertId: string } | null> {
  const normalizedDomain = domain.toLowerCase();
  console.log(
    "[DBG][tenantRepository] Getting domain lookup:",
    normalizedDomain,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.YOGA_CORE,
      Key: {
        PK: DomainLookupPK.DOMAIN(normalizedDomain),
        SK: normalizedDomain,
      },
    }),
  );

  if (!result.Item) {
    console.log("[DBG][tenantRepository] Domain lookup not found");
    return null;
  }

  console.log("[DBG][tenantRepository] Found domain lookup:", normalizedDomain);
  return {
    tenantId: result.Item.tenantId as string,
    expertId: result.Item.expertId as string,
  };
}
