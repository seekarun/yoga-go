/**
 * Tenant Repository - DynamoDB Operations
 *
 * Consolidated entity for Expert/Tenant data (merged).
 * All expert profile data and tenant/domain configuration is stored in TENANT entity.
 *
 * Storage pattern (tenant-partitioned design):
 * - Primary: PK="TENANT#{tenantId}", SK="META"
 * - Domain lookup: PK="TENANT#SYSTEM", SK="DOMAIN#{domain}" -> tenantId
 *
 * Domain lookup uses dual-write pattern for O(1) domain resolution.
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import type { Tenant, TenantStatus, StripeConnectDetails } from '@/types';
import { getSubdomainHost, getExpertEmail } from '@/config/env';

// Type for DynamoDB Tenant item (includes PK/SK)
interface DynamoDBTenantItem extends Tenant {
  PK: string;
  SK: string;
}

// Type for domain reference item
interface DynamoDBDomainItem {
  PK: string;
  SK: string;
  tenantId: string;
  domain: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

// Type for creating a new tenant/expert
export interface CreateTenantInput {
  id: string;
  userId: string;
  name: string;
  title?: string;
  bio?: string;
  avatar?: string;
  rating?: number;
  totalCourses?: number;
  totalStudents?: number;
  specializations?: string[];
  featured?: boolean;
  certifications?: string[];
  experience?: string;
  socialLinks?: Tenant['socialLinks'];
  onboardingCompleted?: boolean;
  platformPreferences?: Tenant['platformPreferences'];
  customLandingPage?: Tenant['customLandingPage'];
  draftLandingPage?: Tenant['draftLandingPage'];
  isLandingPagePublished?: boolean;
  // Domain fields (optional - set later for custom domains)
  primaryDomain?: string;
  additionalDomains?: string[];
  featuredOnPlatform?: boolean;
  status?: TenantStatus;
  // Expert ID review fields (set if AI flagged for review)
  flaggedForReview?: boolean;
  flagReason?: string;
  flaggedAt?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
}

/**
 * Convert DynamoDB item to Tenant type (removes PK/SK)
 */
function toTenant(item: DynamoDBTenantItem): Tenant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...tenant } = item;
  return tenant as Tenant;
}

// ===================================================================
// CORE CRUD OPERATIONS
// ===================================================================

/**
 * Get tenant by ID
 * New PK: TENANT#{tenantId}, SK: META
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  console.log('[DBG][tenantRepository] Getting tenant by id:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_META,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][tenantRepository] Tenant not found');
    return null;
  }

  console.log('[DBG][tenantRepository] Found tenant:', tenantId);
  return toTenant(result.Item as DynamoDBTenantItem);
}

/**
 * Get all tenants
 * Note: Uses Scan since tenants are now in separate partitions
 * This should only be used for admin operations, not for user-facing queries
 */
export async function getAllTenants(): Promise<Tenant[]> {
  console.log('[DBG][tenantRepository] Getting all tenants');

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':pkPrefix': 'TENANT#',
        ':sk': CorePK.TENANT_META,
      },
    })
  );

  const tenants = (result.Items || []).map(item => toTenant(item as DynamoDBTenantItem));
  console.log('[DBG][tenantRepository] Found', tenants.length, 'tenants');
  return tenants;
}

/**
 * Get tenant by user ID (cognitoSub)
 * Note: Uses Scan since we can't query by userId without a GSI
 * This should be called rarely (only during auth flows)
 */
export async function getTenantByUserId(userId: string): Promise<Tenant | null> {
  console.log('[DBG][tenantRepository] Getting tenant by userId:', userId);

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk AND userId = :userId',
      ExpressionAttributeValues: {
        ':pkPrefix': 'TENANT#',
        ':sk': CorePK.TENANT_META,
        ':userId': userId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][tenantRepository] Tenant not found for userId');
    return null;
  }

  console.log('[DBG][tenantRepository] Found tenant for userId:', userId);
  return toTenant(result.Items[0] as DynamoDBTenantItem);
}

/**
 * Get tenant by domain (uses dual-write domain lookup)
 * This is the primary method for middleware domain resolution
 * PK=TENANT#SYSTEM, SK=DOMAIN#{domain}
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  console.log('[DBG][tenantRepository] Getting tenant by domain:', domain);

  // Normalize domain (lowercase, remove port)
  const normalizedDomain = domain.toLowerCase().split(':')[0];

  // Look up domain reference in SYSTEM partition
  const domainResult = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.SYSTEM,
        SK: CorePK.DOMAIN_SK(normalizedDomain),
      },
    })
  );

  if (!domainResult.Item) {
    console.log('[DBG][tenantRepository] Domain not found:', normalizedDomain);
    return null;
  }

  const domainItem = domainResult.Item as DynamoDBDomainItem;

  // Get the actual tenant
  return getTenantById(domainItem.tenantId);
}

/**
 * Create a new tenant/expert
 * Tenant: PK=TENANT#{id}, SK=META
 * Domain: PK=TENANT#SYSTEM, SK=DOMAIN#{domain}
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const now = new Date().toISOString();

  console.log('[DBG][tenantRepository] Creating tenant:', input.id, 'name:', input.name);

  // Default primary domain is {id}.{DOMAIN}
  const primaryDomain = input.primaryDomain || getSubdomainHost(input.id);

  const tenant: DynamoDBTenantItem = {
    PK: CorePK.TENANT(input.id),
    SK: CorePK.TENANT_META,
    id: input.id,
    userId: input.userId,
    name: input.name,
    slug: input.id,
    title: input.title ?? '',
    bio: input.bio ?? '',
    avatar: input.avatar ?? '',
    rating: input.rating ?? 0,
    totalCourses: input.totalCourses ?? 0,
    totalStudents: input.totalStudents ?? 0,
    specializations: input.specializations ?? [],
    featured: input.featured ?? false,
    certifications: input.certifications ?? [],
    experience: input.experience ?? '',
    socialLinks: input.socialLinks ?? {},
    onboardingCompleted: input.onboardingCompleted ?? false,
    platformPreferences: input.platformPreferences ?? {
      featuredOnPlatform: true,
      defaultEmail: getExpertEmail(input.id),
    },
    customLandingPage: input.customLandingPage,
    draftLandingPage: input.draftLandingPage,
    isLandingPagePublished: input.isLandingPagePublished ?? false,
    primaryDomain: primaryDomain.toLowerCase(),
    additionalDomains: (input.additionalDomains || []).map(d => d.toLowerCase()),
    featuredOnPlatform: input.featuredOnPlatform ?? true,
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  };

  // Collect all domains for reference items
  const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(Boolean);

  // Create domain reference items (stored in SYSTEM partition)
  const domainItems = allDomains.map(domain => ({
    PutRequest: {
      Item: {
        PK: CorePK.SYSTEM,
        SK: CorePK.DOMAIN_SK(domain as string),
        tenantId: input.id,
        domain,
        entityType: 'DOMAIN',
        createdAt: now,
        updatedAt: now,
      },
    },
  }));

  // Batch write tenant and domain references
  const writeRequests = [
    {
      PutRequest: {
        Item: tenant,
      },
    },
    ...domainItems,
  ];

  // DynamoDB BatchWriteItem has a limit of 25 items
  for (let i = 0; i < writeRequests.length; i += 25) {
    const batch = writeRequests.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [Tables.CORE]: batch,
        },
      })
    );
  }

  console.log(
    '[DBG][tenantRepository] Created tenant:',
    input.id,
    'with',
    allDomains.length,
    'domains'
  );
  return toTenant(tenant);
}

/**
 * Update tenant - partial update using UpdateCommand
 * New PK: TENANT#{tenantId}, SK: META
 */
export async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Updating tenant:', tenantId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    // Skip immutable fields
    if (value !== undefined && !['id', 'PK', 'SK'].includes(key)) {
      updateParts.push(`#k${index} = :v${index}`);
      exprAttrNames[`#k${index}`] = key;
      exprAttrValues[`:v${index}`] = value;
      index++;
    }
  }

  // Always update updatedAt
  updateParts.push('#updatedAt = :updatedAt');
  exprAttrNames['#updatedAt'] = 'updatedAt';
  exprAttrValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_META,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][tenantRepository] Updated tenant:', tenantId);
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

/**
 * Delete tenant and all domain references
 * Also deletes all items in the tenant partition
 */
export async function deleteTenant(tenantId: string): Promise<void> {
  console.log('[DBG][tenantRepository] Deleting tenant:', tenantId);

  // Get tenant first to find all domains
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.log('[DBG][tenantRepository] Tenant not found, nothing to delete');
    return;
  }

  // Collect all domains
  const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(Boolean);

  // Query all items in the tenant partition
  const tenantItemsResult = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
      },
    })
  );

  // Create delete requests for all tenant items
  const tenantDeleteRequests = (tenantItemsResult.Items || []).map(item => ({
    DeleteRequest: {
      Key: {
        PK: (item as { PK: string }).PK,
        SK: (item as { SK: string }).SK,
      },
    },
  }));

  // Create delete requests for all domain references (in SYSTEM partition)
  const domainDeleteRequests = allDomains.map(domain => ({
    DeleteRequest: {
      Key: {
        PK: CorePK.SYSTEM,
        SK: CorePK.DOMAIN_SK(domain as string),
      },
    },
  }));

  const allDeleteRequests = [...tenantDeleteRequests, ...domainDeleteRequests];

  // Batch delete
  for (let i = 0; i < allDeleteRequests.length; i += 25) {
    const batch = allDeleteRequests.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [Tables.CORE]: batch,
        },
      })
    );
  }

  console.log(
    '[DBG][tenantRepository] Deleted tenant with',
    tenantDeleteRequests.length,
    'items and',
    allDomains.length,
    'domain references'
  );
}

// ===================================================================
// DOMAIN OPERATIONS
// ===================================================================

/**
 * Add a domain to a tenant
 * PK=TENANT#SYSTEM, SK=DOMAIN#{domain}
 */
export async function addDomainToTenant(tenantId: string, domain: string): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Adding domain to tenant:', tenantId, domain);

  const normalizedDomain = domain.toLowerCase();
  const now = new Date().toISOString();

  // Get current tenant
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Check if domain already exists
  const existingDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])].filter(
    Boolean
  );
  if (existingDomains.includes(normalizedDomain)) {
    console.log('[DBG][tenantRepository] Domain already exists');
    return tenant;
  }

  // Check if domain is used by another tenant
  const existingTenant = await getTenantByDomain(normalizedDomain);
  if (existingTenant && existingTenant.id !== tenantId) {
    throw new Error('Unable to add domain. This domain is already in use.');
  }

  // Add domain reference (in SYSTEM partition)
  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: CorePK.SYSTEM,
        SK: CorePK.DOMAIN_SK(normalizedDomain),
        tenantId,
        domain: normalizedDomain,
        entityType: 'DOMAIN',
        createdAt: now,
        updatedAt: now,
      },
    })
  );

  // Update tenant's additional domains
  const updatedDomains = [...(tenant.additionalDomains || []), normalizedDomain];

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_META,
      },
      UpdateExpression: 'SET additionalDomains = :domains, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':domains': updatedDomains,
        ':updatedAt': now,
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][tenantRepository] Added domain:', normalizedDomain);
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

/**
 * Remove a domain from a tenant
 */
export async function removeDomainFromTenant(tenantId: string, domain: string): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Removing domain from tenant:', tenantId, domain);

  const normalizedDomain = domain.toLowerCase();

  // Get current tenant
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Cannot remove primary domain
  if (tenant.primaryDomain === normalizedDomain) {
    throw new Error('Cannot remove primary domain');
  }

  // Delete domain reference (from SYSTEM partition)
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.SYSTEM,
        SK: CorePK.DOMAIN_SK(normalizedDomain),
      },
    })
  );

  // Update tenant's additional domains
  const updatedDomains = (tenant.additionalDomains || []).filter(d => d !== normalizedDomain);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.TENANT_META,
      },
      UpdateExpression: 'SET additionalDomains = :domains, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':domains': updatedDomains,
        ':updatedAt': new Date().toISOString(),
      },
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][tenantRepository] Removed domain:', normalizedDomain);
  return toTenant(result.Attributes as DynamoDBTenantItem);
}

// ===================================================================
// LANDING PAGE OPERATIONS
// ===================================================================

/**
 * Update landing page config (published version)
 */
export async function updateLandingPage(
  tenantId: string,
  landingPage: Tenant['customLandingPage']
): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Updating landing page:', tenantId);
  return updateTenant(tenantId, { customLandingPage: landingPage });
}

/**
 * Update draft landing page config
 * Draft changes are visible only on preview.{DOMAIN} until published
 */
export async function updateDraftLandingPage(
  tenantId: string,
  draftLandingPage: Tenant['draftLandingPage']
): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Updating draft landing page:', tenantId);
  return updateTenant(tenantId, { draftLandingPage });
}

/**
 * Publish landing page
 * Copies draftLandingPage to customLandingPage and sets isLandingPagePublished to true
 */
export async function publishLandingPage(tenantId: string): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Publishing landing page:', tenantId);

  // Get current tenant to access draft
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // If no draft exists, use the current customLandingPage (or empty)
  const landingPageToPublish = tenant.draftLandingPage || tenant.customLandingPage || {};

  return updateTenant(tenantId, {
    customLandingPage: landingPageToPublish,
    isLandingPagePublished: true,
  });
}

/**
 * Discard draft landing page changes
 * Copies customLandingPage (published) to draftLandingPage (draft)
 */
export async function discardDraftLandingPage(tenantId: string): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Discarding draft landing page:', tenantId);

  // Get current tenant to access published version
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Copy published version to draft
  return updateTenant(tenantId, {
    draftLandingPage: tenant.customLandingPage || {},
  });
}

// ===================================================================
// STRIPE CONNECT OPERATIONS
// ===================================================================

/**
 * Update Stripe Connect details
 */
export async function updateStripeConnect(
  tenantId: string,
  stripeConnect: Partial<StripeConnectDetails>
): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Updating Stripe Connect for tenant:', tenantId);

  const existing = await getTenantById(tenantId);
  if (!existing) {
    throw new Error('Tenant not found');
  }

  // Merge with existing stripeConnect data
  const updatedConnect: StripeConnectDetails = {
    ...(existing.stripeConnect as StripeConnectDetails),
    ...stripeConnect,
    lastUpdatedAt: new Date().toISOString(),
  } as StripeConnectDetails;

  return updateTenant(tenantId, { stripeConnect: updatedConnect });
}

/**
 * Check if tenant has active Stripe Connect
 */
export async function hasActiveStripeConnect(tenantId: string): Promise<boolean> {
  const tenant = await getTenantById(tenantId);
  return (
    tenant?.stripeConnect?.status === 'active' &&
    tenant?.stripeConnect?.chargesEnabled === true &&
    tenant?.stripeConnect?.payoutsEnabled === true
  );
}

// ===================================================================
// STATS & FEATURED OPERATIONS
// ===================================================================

/**
 * Update tenant statistics (totalCourses, totalStudents)
 */
export async function updateTenantStats(
  tenantId: string,
  stats: { totalCourses?: number; totalStudents?: number }
): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Updating tenant stats:', tenantId, stats);

  const updates: Partial<Tenant> = {};
  if (stats.totalCourses !== undefined) updates.totalCourses = stats.totalCourses;
  if (stats.totalStudents !== undefined) updates.totalStudents = stats.totalStudents;

  return updateTenant(tenantId, updates);
}

/**
 * Set tenant as featured
 */
export async function setFeatured(tenantId: string, featured: boolean): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Setting tenant featured:', tenantId, featured);
  return updateTenant(tenantId, { featured });
}

/**
 * Get featured tenants
 * Note: Uses Scan since tenants are now in separate partitions
 */
export async function getFeaturedTenants(): Promise<Tenant[]> {
  console.log('[DBG][tenantRepository] Getting featured tenants');

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression: 'begins_with(PK, :pkPrefix) AND SK = :sk AND featured = :featured',
      ExpressionAttributeValues: {
        ':pkPrefix': 'TENANT#',
        ':sk': CorePK.TENANT_META,
        ':featured': true,
      },
    })
  );

  const tenants = (result.Items || []).map(item => toTenant(item as DynamoDBTenantItem));
  console.log('[DBG][tenantRepository] Found', tenants.length, 'featured tenants');
  return tenants;
}

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES (Expert → Tenant)
// These allow existing code using "Expert" terminology to work
// ===================================================================

// Alias types for backward compatibility
export type { Tenant as Expert };
export type CreateExpertInput = CreateTenantInput;

// Function aliases
export const getExpertById = getTenantById;
export const getAllExperts = getAllTenants;
export const getExpertByUserId = getTenantByUserId;
export const createExpert = createTenant;
export const updateExpert = updateTenant;
export const deleteExpert = deleteTenant;
export const updateExpertStats = updateTenantStats;
export const getFeaturedExperts = getFeaturedTenants;

// Legacy alias: getTenantByExpertId is now just getTenantById (since tenant ID = expert ID)
export const getTenantByExpertId = getTenantById;
