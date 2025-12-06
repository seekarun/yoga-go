/**
 * Tenant Repository - DynamoDB Operations
 *
 * Multi-tenancy support with domain-based routing.
 *
 * Storage pattern:
 * - Primary: PK="TENANT", SK={tenantId}
 * - Domain lookup: PK="TENANT#DOMAIN#{domain}", SK={tenantId}
 *
 * Domain lookup uses dual-write pattern for O(1) domain resolution.
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType, CorePK } from '../dynamodb';
import type { Tenant, TenantStatus } from '@/types';

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
}

// Type for creating a new tenant
export interface CreateTenantInput {
  id: string;
  name: string;
  slug: string;
  expertId: string;
  primaryDomain: string;
  additionalDomains?: string[];
  featuredOnPlatform?: boolean;
  status?: TenantStatus;
}

/**
 * Convert DynamoDB item to Tenant type (removes PK/SK)
 */
function toTenant(item: DynamoDBTenantItem): Tenant {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...tenant } = item;
  return tenant as Tenant;
}

/**
 * Get tenant by ID
 */
export async function getTenantById(tenantId: string): Promise<Tenant | null> {
  console.log('[DBG][tenantRepository] Getting tenant by id:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.TENANT,
        SK: tenantId,
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
 * Get tenant by domain (uses dual-write domain lookup)
 * This is the primary method for middleware domain resolution
 */
export async function getTenantByDomain(domain: string): Promise<Tenant | null> {
  console.log('[DBG][tenantRepository] Getting tenant by domain:', domain);

  // Normalize domain (lowercase, remove port)
  const normalizedDomain = domain.toLowerCase().split(':')[0];

  // Look up domain reference
  const domainResult = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT_DOMAIN(normalizedDomain),
        SK: normalizedDomain,
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
 * Get tenant by expert ID
 */
export async function getTenantByExpertId(expertId: string): Promise<Tenant | null> {
  console.log('[DBG][tenantRepository] Getting tenant by expertId:', expertId);

  // Query all tenants and filter by expertId
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'expertId = :expertId',
      ExpressionAttributeValues: {
        ':pk': EntityType.TENANT,
        ':expertId': expertId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][tenantRepository] Tenant not found for expertId');
    return null;
  }

  console.log('[DBG][tenantRepository] Found tenant for expertId:', expertId);
  return toTenant(result.Items[0] as DynamoDBTenantItem);
}

/**
 * Get all tenants
 */
export async function getAllTenants(): Promise<Tenant[]> {
  console.log('[DBG][tenantRepository] Getting all tenants');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EntityType.TENANT,
      },
    })
  );

  const tenants = (result.Items || []).map(item => toTenant(item as DynamoDBTenantItem));
  console.log('[DBG][tenantRepository] Found', tenants.length, 'tenants');
  return tenants;
}

/**
 * Create a new tenant with domain references
 */
export async function createTenant(input: CreateTenantInput): Promise<Tenant> {
  const now = new Date().toISOString();

  console.log('[DBG][tenantRepository] Creating tenant:', input.id, 'name:', input.name);

  const tenant: DynamoDBTenantItem = {
    PK: EntityType.TENANT,
    SK: input.id,
    id: input.id,
    name: input.name,
    slug: input.slug,
    expertId: input.expertId,
    primaryDomain: input.primaryDomain.toLowerCase(),
    additionalDomains: (input.additionalDomains || []).map(d => d.toLowerCase()),
    featuredOnPlatform: input.featuredOnPlatform ?? true,
    status: input.status ?? 'active',
    createdAt: now,
    updatedAt: now,
  };

  // Collect all domains for reference items
  const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])];

  // Create domain reference items
  const domainItems = allDomains.map(domain => ({
    PutRequest: {
      Item: {
        PK: CorePK.TENANT_DOMAIN(domain),
        SK: domain,
        tenantId: input.id,
        domain,
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
 * Add a domain to a tenant
 */
export async function addDomainToTenant(tenantId: string, domain: string): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Adding domain to tenant:', tenantId, domain);

  const normalizedDomain = domain.toLowerCase();

  // Get current tenant
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  // Check if domain already exists
  const existingDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])];
  if (existingDomains.includes(normalizedDomain)) {
    console.log('[DBG][tenantRepository] Domain already exists');
    return tenant;
  }

  // Check if domain is used by another tenant
  const existingTenant = await getTenantByDomain(normalizedDomain);
  if (existingTenant && existingTenant.id !== tenantId) {
    throw new Error(`Domain already in use by another tenant: ${normalizedDomain}`);
  }

  // Add domain reference
  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: CorePK.TENANT_DOMAIN(normalizedDomain),
        SK: normalizedDomain,
        tenantId,
        domain: normalizedDomain,
      },
    })
  );

  // Update tenant's additional domains
  const updatedDomains = [...(tenant.additionalDomains || []), normalizedDomain];

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.TENANT,
        SK: tenantId,
      },
      UpdateExpression: 'SET additionalDomains = :domains, updatedAt = :updatedAt',
      ExpressionAttributeValues: {
        ':domains': updatedDomains,
        ':updatedAt': new Date().toISOString(),
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

  // Delete domain reference
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT_DOMAIN(normalizedDomain),
        SK: normalizedDomain,
      },
    })
  );

  // Update tenant's additional domains
  const updatedDomains = (tenant.additionalDomains || []).filter(d => d !== normalizedDomain);

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.TENANT,
        SK: tenantId,
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

/**
 * Update tenant
 */
export async function updateTenant(tenantId: string, updates: Partial<Tenant>): Promise<Tenant> {
  console.log('[DBG][tenantRepository] Updating tenant:', tenantId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    // Skip immutable fields and domain-related fields (use addDomain/removeDomain)
    if (
      value !== undefined &&
      !['id', 'PK', 'SK', 'primaryDomain', 'additionalDomains', 'expertId'].includes(key)
    ) {
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
        PK: EntityType.TENANT,
        SK: tenantId,
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
  const allDomains = [tenant.primaryDomain, ...(tenant.additionalDomains || [])];

  // Create delete requests for all domain references
  const deleteRequests = allDomains.map(domain => ({
    DeleteRequest: {
      Key: {
        PK: CorePK.TENANT_DOMAIN(domain),
        SK: domain,
      },
    },
  }));

  // Add tenant delete request
  deleteRequests.push({
    DeleteRequest: {
      Key: {
        PK: EntityType.TENANT,
        SK: tenantId,
      },
    },
  });

  // Batch delete
  for (let i = 0; i < deleteRequests.length; i += 25) {
    const batch = deleteRequests.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [Tables.CORE]: batch,
        },
      })
    );
  }

  console.log('[DBG][tenantRepository] Deleted tenant and', allDomains.length, 'domain references');
}

/**
 * Get tenants featured on platform
 */
export async function getFeaturedTenants(): Promise<Tenant[]> {
  console.log('[DBG][tenantRepository] Getting featured tenants');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'featuredOnPlatform = :featured AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':pk': EntityType.TENANT,
        ':featured': true,
        ':status': 'active',
      },
    })
  );

  const tenants = (result.Items || []).map(item => toTenant(item as DynamoDBTenantItem));
  console.log('[DBG][tenantRepository] Found', tenants.length, 'featured tenants');
  return tenants;
}
