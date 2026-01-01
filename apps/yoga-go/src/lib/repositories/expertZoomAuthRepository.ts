/**
 * Expert Zoom Auth Repository - DynamoDB Operations
 *
 * Stores OAuth tokens for experts to create Zoom meeting links
 * PK: TENANT#{tenantId}, SK: ZOOM_AUTH
 *
 * Also maintains a lookup index for webhooks:
 * PK: ZOOM_EMAIL#{email}, SK: META -> tenantId
 */

import { GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK, EntityType } from '../dynamodb';
import type { ExpertZoomAuth } from '@/types';

// Type for DynamoDB item (includes PK/SK)
interface DynamoDBZoomAuthItem extends ExpertZoomAuth {
  PK: string;
  SK: string;
}

// Type for email lookup item
interface ZoomEmailLookupItem {
  PK: string;
  SK: string;
  tenantId: string;
  email: string;
  entityType: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Convert DynamoDB item to ExpertZoomAuth type (removes PK/SK)
 */
function toZoomAuth(item: DynamoDBZoomAuthItem): ExpertZoomAuth {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...auth } = item;
  return auth as ExpertZoomAuth;
}

/**
 * Get Zoom auth tokens for a tenant
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function getZoomAuth(tenantId: string): Promise<ExpertZoomAuth | null> {
  console.log('[DBG][expertZoomAuthRepo] Getting Zoom auth for tenant:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.ZOOM_AUTH,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][expertZoomAuthRepo] Zoom auth not found');
    return null;
  }

  console.log('[DBG][expertZoomAuthRepo] Found Zoom auth');
  return toZoomAuth(result.Item as DynamoDBZoomAuthItem);
}

/**
 * Get tenant ID by Zoom email (for webhook processing)
 * Uses the ZOOM_EMAIL lookup index
 */
export async function getTenantIdByZoomEmail(email: string): Promise<string | null> {
  const normalizedEmail = email.toLowerCase().trim();
  console.log('[DBG][expertZoomAuthRepo] Looking up tenant by Zoom email:', normalizedEmail);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.SYSTEM,
        SK: CorePK.ZOOM_EMAIL_SK(normalizedEmail),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][expertZoomAuthRepo] No tenant found for Zoom email');
    return null;
  }

  const tenantId = (result.Item as ZoomEmailLookupItem).tenantId;
  console.log('[DBG][expertZoomAuthRepo] Found tenant for Zoom email:', tenantId);
  return tenantId;
}

/**
 * Get Zoom auth by email (for webhook processing)
 * First looks up tenantId by email, then fetches the full auth record
 */
export async function getZoomAuthByEmail(email: string): Promise<ExpertZoomAuth | null> {
  const tenantId = await getTenantIdByZoomEmail(email);
  if (!tenantId) {
    return null;
  }
  return getZoomAuth(tenantId);
}

/**
 * Save Zoom auth tokens for a tenant
 * Also creates a ZOOM_EMAIL lookup for webhook processing
 */
export async function saveZoomAuth(auth: ExpertZoomAuth): Promise<ExpertZoomAuth> {
  const now = new Date().toISOString();
  const tenantId = auth.expertId; // expertId is the tenantId

  console.log('[DBG][expertZoomAuthRepo] Saving Zoom auth for tenant:', tenantId);

  const item: DynamoDBZoomAuthItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.ZOOM_AUTH,
    ...auth,
    id: tenantId,
    createdAt: auth.createdAt || now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  // Also save email lookup for webhook processing (in SYSTEM partition)
  if (auth.email) {
    const emailLookupItem: ZoomEmailLookupItem = {
      PK: CorePK.SYSTEM,
      SK: CorePK.ZOOM_EMAIL_SK(auth.email.toLowerCase()),
      tenantId,
      email: auth.email.toLowerCase(),
      entityType: EntityType.ZOOM_AUTH,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: Tables.CORE,
        Item: emailLookupItem,
      })
    );
    console.log('[DBG][expertZoomAuthRepo] Saved Zoom email lookup');
  }

  console.log('[DBG][expertZoomAuthRepo] Saved Zoom auth');
  return toZoomAuth(item);
}

/**
 * Update Zoom auth tokens (e.g., after token refresh)
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function updateZoomAuth(
  tenantId: string,
  updates: Partial<ExpertZoomAuth>
): Promise<ExpertZoomAuth> {
  console.log('[DBG][expertZoomAuthRepo] Updating Zoom auth for tenant:', tenantId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'expertId' && key !== 'PK' && key !== 'SK') {
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
        SK: CorePK.ZOOM_AUTH,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][expertZoomAuthRepo] Updated Zoom auth');
  return toZoomAuth(result.Attributes as DynamoDBZoomAuthItem);
}

/**
 * Delete Zoom auth tokens (disconnect Zoom account)
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function deleteZoomAuth(tenantId: string): Promise<void> {
  console.log('[DBG][expertZoomAuthRepo] Deleting Zoom auth for tenant:', tenantId);

  // First get the auth to find the email for cleanup
  const auth = await getZoomAuth(tenantId);

  // Delete the main auth record
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.ZOOM_AUTH,
      },
    })
  );

  // Delete the email lookup if it exists (from SYSTEM partition)
  if (auth?.email) {
    await docClient.send(
      new DeleteCommand({
        TableName: Tables.CORE,
        Key: {
          PK: CorePK.SYSTEM,
          SK: CorePK.ZOOM_EMAIL_SK(auth.email.toLowerCase()),
        },
      })
    );
    console.log('[DBG][expertZoomAuthRepo] Deleted Zoom email lookup');
  }

  console.log('[DBG][expertZoomAuthRepo] Deleted Zoom auth');
}

/**
 * Check if tenant has connected Zoom account
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function isZoomConnected(tenantId: string): Promise<boolean> {
  const auth = await getZoomAuth(tenantId);
  return auth !== null;
}

/**
 * Check if tokens are expired and need refresh
 */
export function isTokenExpired(auth: ExpertZoomAuth): boolean {
  const expiresAt = new Date(auth.expiresAt);
  const now = new Date();
  // Consider expired if less than 5 minutes until expiry
  const bufferMs = 5 * 60 * 1000;
  return expiresAt.getTime() - now.getTime() < bufferMs;
}
