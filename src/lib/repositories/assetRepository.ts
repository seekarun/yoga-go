/**
 * Asset repository for DynamoDB operations
 * Handles CRUD operations for assets (images, videos, documents)
 *
 * PK: ASSET
 * SK: {assetId}
 */

import { docClient, Tables, EntityType } from '../dynamodb';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { Asset } from '@/types';

/**
 * Create a new asset
 */
export async function createAsset(input: Asset): Promise<Asset> {
  console.log('[DBG][assetRepository] Creating asset:', input.id);

  const now = new Date().toISOString();
  const asset: Asset = {
    ...input,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };

  const item = {
    PK: EntityType.ASSET,
    SK: input.id,
    entityType: EntityType.ASSET,
    // GSI for querying by cloudflareImageId
    GSI1PK: `CLOUDFLARE#${input.cloudflareImageId}`,
    GSI1SK: EntityType.ASSET,
    // GSI for querying by relatedTo (e.g., expert, course)
    GSI2PK: input.relatedTo
      ? `${input.relatedTo.type.toUpperCase()}#${input.relatedTo.id}`
      : 'UNRELATED',
    GSI2SK: `ASSET#${input.id}`,
    // GSI for querying by uploadedBy
    GSI3PK: input.uploadedBy ? `USER#${input.uploadedBy}` : 'ANONYMOUS',
    GSI3SK: `ASSET#${now}`,
    ...asset,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: item,
    })
  );

  console.log('[DBG][assetRepository] Asset created:', input.id);
  return asset;
}

/**
 * Get an asset by ID
 */
export async function getAssetById(assetId: string): Promise<Asset | null> {
  console.log('[DBG][assetRepository] Getting asset:', assetId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.ASSET,
        SK: assetId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][assetRepository] Asset not found:', assetId);
    return null;
  }

  return mapToAsset(result.Item);
}

/**
 * Get an asset by Cloudflare Image ID
 */
export async function getAssetByCloudflareId(cloudflareImageId: string): Promise<Asset | null> {
  console.log('[DBG][assetRepository] Getting asset by Cloudflare ID:', cloudflareImageId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `CLOUDFLARE#${cloudflareImageId}`,
      },
      Limit: 1,
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][assetRepository] Asset not found for Cloudflare ID:', cloudflareImageId);
    return null;
  }

  return mapToAsset(result.Items[0]);
}

/**
 * Get assets related to an entity (expert, course, etc.)
 */
export async function getAssetsByRelatedTo(
  relatedType: 'expert' | 'user' | 'course' | 'lesson',
  relatedId: string
): Promise<Asset[]> {
  console.log('[DBG][assetRepository] Getting assets for:', relatedType, relatedId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI2',
      KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :gsi2skPrefix)',
      ExpressionAttributeValues: {
        ':gsi2pk': `${relatedType.toUpperCase()}#${relatedId}`,
        ':gsi2skPrefix': 'ASSET#',
      },
    })
  );

  const assets = (result.Items || []).map(mapToAsset);
  console.log('[DBG][assetRepository] Found', assets.length, 'assets');
  return assets;
}

/**
 * Get assets uploaded by a user
 */
export async function getAssetsByUploadedBy(userId: string): Promise<Asset[]> {
  console.log('[DBG][assetRepository] Getting assets uploaded by:', userId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      IndexName: 'GSI3',
      KeyConditionExpression: 'GSI3PK = :gsi3pk AND begins_with(GSI3SK, :gsi3skPrefix)',
      ExpressionAttributeValues: {
        ':gsi3pk': `USER#${userId}`,
        ':gsi3skPrefix': 'ASSET#',
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const assets = (result.Items || []).map(mapToAsset);
  console.log('[DBG][assetRepository] Found', assets.length, 'assets');
  return assets;
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string): Promise<boolean> {
  console.log('[DBG][assetRepository] Deleting asset:', assetId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.ASSET,
        SK: assetId,
      },
    })
  );

  console.log('[DBG][assetRepository] Asset deleted:', assetId);
  return true;
}

/**
 * Map DynamoDB item to Asset type
 */
function mapToAsset(item: Record<string, unknown>): Asset {
  return {
    id: item.id as string,
    filename: item.filename as string,
    originalUrl: item.originalUrl as string,
    croppedUrl: item.croppedUrl as string | undefined,
    cloudflareImageId: item.cloudflareImageId as string,
    croppedCloudflareImageId: item.croppedCloudflareImageId as string | undefined,
    type: item.type as 'image' | 'video' | 'document',
    category: item.category as
      | 'avatar'
      | 'banner'
      | 'thumbnail'
      | 'course'
      | 'lesson'
      | 'about'
      | 'other',
    dimensions: item.dimensions as { width: number; height: number },
    cropData: item.cropData as
      | { x: number; y: number; width: number; height: number; zoom?: number }
      | undefined,
    size: item.size as number,
    mimeType: item.mimeType as string,
    uploadedBy: item.uploadedBy as string | undefined,
    relatedTo: item.relatedTo as
      | { type: 'expert' | 'user' | 'course' | 'lesson'; id: string }
      | undefined,
    metadata: item.metadata as Record<string, unknown> | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
