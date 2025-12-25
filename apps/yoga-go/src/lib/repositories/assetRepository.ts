/**
 * Asset repository for DynamoDB operations
 * Handles CRUD operations for assets (images, videos, documents)
 *
 * Schema (tenant-partitioned for isolation):
 * - PK: "TENANT#{tenantId}" (expertId that owns the asset)
 * - SK: "ASSET#{assetId}"
 *
 * GSI1 (by Cloudflare ID):
 * - GSI1PK: "CLOUDFLARE#{cloudflareImageId}"
 * - GSI1SK: "ASSET"
 */

import { docClient, Tables } from '../dynamodb';
import { PutCommand, GetCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import type { Asset } from '@/types';

// PK helper
const AssetsPK = {
  TENANT: (tenantId: string) => `TENANT#${tenantId}`,
};

/**
 * Create a new asset
 */
export async function createAsset(input: Asset): Promise<Asset> {
  console.log('[DBG][assetRepository] Creating asset:', input.id, 'for tenant:', input.tenantId);

  const now = new Date().toISOString();
  const asset: Asset = {
    ...input,
    createdAt: input.createdAt || now,
    updatedAt: input.updatedAt || now,
  };

  const item = {
    // Tenant-partitioned PK for isolation
    PK: AssetsPK.TENANT(input.tenantId),
    SK: `ASSET#${input.id}`,
    entityType: 'ASSET',
    // GSI for querying by cloudflareImageId
    GSI1PK: `CLOUDFLARE#${input.cloudflareImageId}`,
    GSI1SK: 'ASSET',
    ...asset,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.ASSETS,
      Item: item,
    })
  );

  console.log('[DBG][assetRepository] Asset created:', input.id);
  return asset;
}

/**
 * Get an asset by ID (requires tenantId for direct lookup)
 */
export async function getAssetById(assetId: string, tenantId: string): Promise<Asset | null> {
  console.log('[DBG][assetRepository] Getting asset:', assetId, 'for tenant:', tenantId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.ASSETS,
      Key: {
        PK: AssetsPK.TENANT(tenantId),
        SK: `ASSET#${assetId}`,
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
 * Get an asset by Cloudflare Image ID (uses GSI1)
 */
export async function getAssetByCloudflareId(cloudflareImageId: string): Promise<Asset | null> {
  console.log('[DBG][assetRepository] Getting asset by Cloudflare ID:', cloudflareImageId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.ASSETS,
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
 * Get all assets for a tenant (expert)
 */
export async function getAssetsByTenant(tenantId: string): Promise<Asset[]> {
  console.log('[DBG][assetRepository] Getting assets for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.ASSETS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': AssetsPK.TENANT(tenantId),
        ':skPrefix': 'ASSET#',
      },
    })
  );

  const assets = (result.Items || []).map(mapToAsset);
  console.log('[DBG][assetRepository] Found', assets.length, 'assets for tenant:', tenantId);
  return assets;
}

/**
 * Delete an asset
 */
export async function deleteAsset(assetId: string, tenantId: string): Promise<boolean> {
  console.log('[DBG][assetRepository] Deleting asset:', assetId, 'for tenant:', tenantId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.ASSETS,
      Key: {
        PK: AssetsPK.TENANT(tenantId),
        SK: `ASSET#${assetId}`,
      },
    })
  );

  console.log('[DBG][assetRepository] Asset deleted:', assetId);
  return true;
}

/**
 * Delete all assets for a tenant (for cleanup) - DynamoDB only
 */
export async function deleteAllAssetsByTenant(tenantId: string): Promise<number> {
  console.log('[DBG][assetRepository] Deleting all assets for tenant:', tenantId);

  const assets = await getAssetsByTenant(tenantId);
  let deletedCount = 0;

  for (const asset of assets) {
    await deleteAsset(asset.id, tenantId);
    deletedCount++;
  }

  console.log('[DBG][assetRepository] Deleted', deletedCount, 'assets for tenant:', tenantId);
  return deletedCount;
}

/**
 * Delete a Cloudflare image by ID
 */
async function deleteCloudflareImage(cloudflareImageId: string): Promise<boolean> {
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_TOKEN = process.env.CF_TOKEN;

  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    console.log('[DBG][assetRepository] Cloudflare credentials not configured, skipping');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${cloudflareImageId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
        },
      }
    );
    return response.ok;
  } catch (error) {
    console.warn(
      '[DBG][assetRepository] Error deleting Cloudflare image:',
      cloudflareImageId,
      error
    );
    return false;
  }
}

/**
 * Delete a Cloudflare Stream video by ID
 */
async function deleteCloudflareVideo(videoId: string): Promise<boolean> {
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_TOKEN = process.env.CF_TOKEN;

  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    console.log('[DBG][assetRepository] Cloudflare credentials not configured, skipping');
    return false;
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream/${videoId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
        },
      }
    );
    return response.ok;
  } catch (error) {
    console.warn('[DBG][assetRepository] Error deleting Cloudflare video:', videoId, error);
    return false;
  }
}

/**
 * Result of comprehensive asset deletion
 */
export interface AssetDeletionResult {
  assetsDeleted: number;
  cloudflareImagesDeleted: number;
  cloudflareVideosDeleted: number;
}

/**
 * Delete all assets for a tenant including Cloudflare media
 * This performs comprehensive cleanup:
 * 1. Gets all assets for the tenant
 * 2. Deletes each from Cloudflare (images and videos)
 * 3. Deletes from DynamoDB
 */
export async function deleteAllAssetsWithCloudflare(
  tenantId: string
): Promise<AssetDeletionResult> {
  console.log(
    '[DBG][assetRepository] Deleting all assets with Cloudflare cleanup for tenant:',
    tenantId
  );

  const assets = await getAssetsByTenant(tenantId);
  const result: AssetDeletionResult = {
    assetsDeleted: 0,
    cloudflareImagesDeleted: 0,
    cloudflareVideosDeleted: 0,
  };

  for (const asset of assets) {
    // Delete from Cloudflare based on asset type
    if (asset.type === 'video' && asset.cloudflareImageId) {
      // For videos, cloudflareImageId stores the Stream video ID
      const success = await deleteCloudflareVideo(asset.cloudflareImageId);
      if (success) result.cloudflareVideosDeleted++;
    } else if (asset.type === 'image') {
      // Delete original image
      if (asset.cloudflareImageId) {
        const success = await deleteCloudflareImage(asset.cloudflareImageId);
        if (success) result.cloudflareImagesDeleted++;
      }
      // Delete cropped image if exists
      if (asset.croppedCloudflareImageId) {
        const success = await deleteCloudflareImage(asset.croppedCloudflareImageId);
        if (success) result.cloudflareImagesDeleted++;
      }
    }

    // Delete from DynamoDB
    await deleteAsset(asset.id, tenantId);
    result.assetsDeleted++;
  }

  console.log('[DBG][assetRepository] Deleted assets:', result);
  return result;
}

/**
 * Map DynamoDB item to Asset type
 */
function mapToAsset(item: Record<string, unknown>): Asset {
  return {
    id: item.id as string,
    tenantId: item.tenantId as string,
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
