/**
 * Expert Google Auth Repository - DynamoDB Operations
 *
 * Stores OAuth tokens for experts to create Google Meet links
 * PK: TENANT#{tenantId}, SK: GOOGLE_AUTH
 */

import { GetCommand, PutCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK, EntityType } from '../dynamodb';
import type { ExpertGoogleAuth } from '@/types';

// Type for DynamoDB item (includes PK/SK)
interface DynamoDBGoogleAuthItem extends ExpertGoogleAuth {
  PK: string;
  SK: string;
}

/**
 * Convert DynamoDB item to ExpertGoogleAuth type (removes PK/SK)
 */
function toGoogleAuth(item: DynamoDBGoogleAuthItem): ExpertGoogleAuth {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...auth } = item;
  return auth as ExpertGoogleAuth;
}

/**
 * Get Google auth tokens for a tenant
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function getGoogleAuth(tenantId: string): Promise<ExpertGoogleAuth | null> {
  console.log('[DBG][expertGoogleAuthRepo] Getting Google auth for tenant:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.GOOGLE_AUTH,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][expertGoogleAuthRepo] Google auth not found');
    return null;
  }

  console.log('[DBG][expertGoogleAuthRepo] Found Google auth');
  return toGoogleAuth(result.Item as DynamoDBGoogleAuthItem);
}

/**
 * Save Google auth tokens for a tenant
 */
export async function saveGoogleAuth(auth: ExpertGoogleAuth): Promise<ExpertGoogleAuth> {
  const now = new Date().toISOString();
  const tenantId = auth.expertId; // expertId is the tenantId

  console.log('[DBG][expertGoogleAuthRepo] Saving Google auth for tenant:', tenantId);

  const item: DynamoDBGoogleAuthItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.GOOGLE_AUTH,
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

  console.log('[DBG][expertGoogleAuthRepo] Saved Google auth');
  return toGoogleAuth(item);
}

/**
 * Update Google auth tokens (e.g., after token refresh)
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function updateGoogleAuth(
  tenantId: string,
  updates: Partial<ExpertGoogleAuth>
): Promise<ExpertGoogleAuth> {
  console.log('[DBG][expertGoogleAuthRepo] Updating Google auth for tenant:', tenantId);

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
        SK: CorePK.GOOGLE_AUTH,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][expertGoogleAuthRepo] Updated Google auth');
  return toGoogleAuth(result.Attributes as DynamoDBGoogleAuthItem);
}

/**
 * Delete Google auth tokens (disconnect Google account)
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function deleteGoogleAuth(tenantId: string): Promise<void> {
  console.log('[DBG][expertGoogleAuthRepo] Deleting Google auth for tenant:', tenantId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.GOOGLE_AUTH,
      },
    })
  );

  console.log('[DBG][expertGoogleAuthRepo] Deleted Google auth');
}

/**
 * Check if tenant has connected Google account
 * @param tenantId - The tenant ID (same as expertId)
 */
export async function isGoogleConnected(tenantId: string): Promise<boolean> {
  const auth = await getGoogleAuth(tenantId);
  return auth !== null;
}

/**
 * Check if tokens are expired and need refresh
 */
export function isTokenExpired(auth: ExpertGoogleAuth): boolean {
  const expiresAt = new Date(auth.expiresAt);
  const now = new Date();
  // Consider expired if less than 5 minutes until expiry
  const bufferMs = 5 * 60 * 1000;
  return expiresAt.getTime() - now.getTime() < bufferMs;
}
