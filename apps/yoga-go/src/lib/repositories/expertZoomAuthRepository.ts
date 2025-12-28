/**
 * Expert Zoom Auth Repository - DynamoDB Operations
 *
 * Stores OAuth tokens for experts to create Zoom meeting links
 * PK: "ZOOM_AUTH", SK: expertId
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType } from '../dynamodb';
import type { ExpertZoomAuth } from '@/types';

// Type for DynamoDB item (includes PK/SK)
interface DynamoDBZoomAuthItem extends ExpertZoomAuth {
  PK: string;
  SK: string;
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
 * Get Zoom auth tokens for an expert
 */
export async function getZoomAuth(expertId: string): Promise<ExpertZoomAuth | null> {
  console.log('[DBG][expertZoomAuthRepo] Getting Zoom auth for expert:', expertId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.ZOOM_AUTH,
        SK: expertId,
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
 * Get Zoom auth by email address (for webhook processing)
 * Queries all ZOOM_AUTH records and filters by email
 */
export async function getExpertZoomAuthByEmail(email: string): Promise<ExpertZoomAuth | null> {
  console.log('[DBG][expertZoomAuthRepo] Getting Zoom auth by email:', email);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':pk': EntityType.ZOOM_AUTH,
        ':email': email,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][expertZoomAuthRepo] Zoom auth not found for email');
    return null;
  }

  console.log('[DBG][expertZoomAuthRepo] Found Zoom auth for email');
  return toZoomAuth(result.Items[0] as DynamoDBZoomAuthItem);
}

/**
 * Save Zoom auth tokens for an expert
 */
export async function saveZoomAuth(auth: ExpertZoomAuth): Promise<ExpertZoomAuth> {
  const now = new Date().toISOString();

  console.log('[DBG][expertZoomAuthRepo] Saving Zoom auth for expert:', auth.expertId);

  const item: DynamoDBZoomAuthItem = {
    PK: EntityType.ZOOM_AUTH,
    SK: auth.expertId,
    ...auth,
    id: auth.expertId, // Use expertId as the id
    createdAt: auth.createdAt || now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][expertZoomAuthRepo] Saved Zoom auth');
  return toZoomAuth(item);
}

/**
 * Update Zoom auth tokens (e.g., after token refresh)
 */
export async function updateZoomAuth(
  expertId: string,
  updates: Partial<ExpertZoomAuth>
): Promise<ExpertZoomAuth> {
  console.log('[DBG][expertZoomAuthRepo] Updating Zoom auth for expert:', expertId);

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
        PK: EntityType.ZOOM_AUTH,
        SK: expertId,
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
 */
export async function deleteZoomAuth(expertId: string): Promise<void> {
  console.log('[DBG][expertZoomAuthRepo] Deleting Zoom auth for expert:', expertId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.ZOOM_AUTH,
        SK: expertId,
      },
    })
  );

  console.log('[DBG][expertZoomAuthRepo] Deleted Zoom auth');
}

/**
 * Check if expert has connected Zoom account
 */
export async function isZoomConnected(expertId: string): Promise<boolean> {
  const auth = await getZoomAuth(expertId);
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
