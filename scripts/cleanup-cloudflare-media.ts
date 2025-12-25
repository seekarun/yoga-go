/**
 * Cleanup script: Delete all Cloudflare media (images and videos)
 * Also clears the yoga-go-assets DynamoDB table
 *
 * Run with: AWS_PROFILE=myg npx ts-node scripts/cleanup-cloudflare-media.ts
 *
 * Required env vars: CF_ACCOUNT_ID, CF_TOKEN
 */

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

// Load env from .env.local
import { config } from 'dotenv';
config({ path: 'apps/yoga-go/.env.local' });

const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
const CF_TOKEN = process.env.CF_TOKEN;

const client = new DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(client);

const ASSETS_TABLE = 'yoga-go-assets';

interface CloudflareListResponse {
  success: boolean;
  result: { images?: Array<{ id: string }>; videos?: Array<{ uid: string }> };
  result_info?: { count: number; total_count: number };
  errors?: Array<{ message: string }>;
}

async function listCloudflareImages(): Promise<string[]> {
  console.log('\n📷 Listing Cloudflare Images...');

  const allImageIds: string[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${CF_TOKEN}`,
        },
      }
    );

    const data: CloudflareListResponse = await response.json();

    if (!data.success) {
      console.error('Failed to list images:', data.errors);
      break;
    }

    const images = data.result.images || [];
    if (images.length === 0) break;

    allImageIds.push(...images.map(img => img.id));
    console.log(`  Found ${images.length} images on page ${page}`);

    if (images.length < perPage) break;
    page++;
  }

  console.log(`  Total images found: ${allImageIds.length}`);
  return allImageIds;
}

async function deleteCloudflareImage(imageId: string): Promise<boolean> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/images/v1/${imageId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
      },
    }
  );

  return response.ok;
}

async function listCloudflareVideos(): Promise<string[]> {
  console.log('\n🎬 Listing Cloudflare Stream Videos...');

  const allVideoIds: string[] = [];

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/stream`,
    {
      headers: {
        Authorization: `Bearer ${CF_TOKEN}`,
      },
    }
  );

  const data = await response.json();

  if (!data.success) {
    console.error('Failed to list videos:', data.errors);
    return [];
  }

  const videos = data.result || [];
  allVideoIds.push(...videos.map((v: { uid: string }) => v.uid));

  console.log(`  Total videos found: ${allVideoIds.length}`);
  return allVideoIds;
}

async function deleteCloudflareVideo(videoId: string): Promise<boolean> {
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
}

async function clearDynamoDBAssets(): Promise<number> {
  console.log('\n🗄️  Clearing DynamoDB assets table...');

  let deletedCount = 0;
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const scanResult = await client.send(
      new ScanCommand({
        TableName: ASSETS_TABLE,
        ProjectionExpression: 'PK, SK',
        ExclusiveStartKey: lastEvaluatedKey as Record<string, { S: string }> | undefined,
      })
    );

    const items = scanResult.Items || [];
    if (items.length === 0) break;

    // Batch delete (max 25 items per batch)
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const deleteRequests = batch.map(item => {
        const plainItem = unmarshall(item);
        return {
          DeleteRequest: {
            Key: {
              PK: plainItem.PK,
              SK: plainItem.SK,
            },
          },
        };
      });

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [ASSETS_TABLE]: deleteRequests,
          },
        })
      );

      deletedCount += batch.length;
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  console.log(`  Deleted ${deletedCount} asset records from DynamoDB`);
  return deletedCount;
}

async function main() {
  console.log('🧹 Cloudflare Media Cleanup Script\n');

  if (!CF_ACCOUNT_ID || !CF_TOKEN) {
    console.error('❌ Missing CF_ACCOUNT_ID or CF_TOKEN environment variables');
    console.log('   Set them in apps/yoga-go/.env.local or as environment variables');
    process.exit(1);
  }

  console.log(`Account ID: ${CF_ACCOUNT_ID}`);

  // 1. Delete Cloudflare Images
  const imageIds = await listCloudflareImages();
  let imagesDeleted = 0;
  let imagesFailed = 0;
  console.log(`  Deleting ${imageIds.length} images...`);
  for (const imageId of imageIds) {
    const success = await deleteCloudflareImage(imageId);
    if (success) {
      imagesDeleted++;
    } else {
      imagesFailed++;
    }
    // Log progress every 50 images
    if ((imagesDeleted + imagesFailed) % 50 === 0) {
      console.log(`    Progress: ${imagesDeleted + imagesFailed}/${imageIds.length}`);
    }
  }
  console.log(`  ✅ Deleted ${imagesDeleted} images (${imagesFailed} failed)`);

  // 2. Delete Cloudflare Stream Videos
  const videoIds = await listCloudflareVideos();
  let videosDeleted = 0;
  let videosFailed = 0;
  console.log(`  Deleting ${videoIds.length} videos...`);
  for (const videoId of videoIds) {
    const success = await deleteCloudflareVideo(videoId);
    if (success) {
      videosDeleted++;
    } else {
      videosFailed++;
    }
    // Log progress every 10 videos
    if ((videosDeleted + videosFailed) % 10 === 0 && videoIds.length > 10) {
      console.log(`    Progress: ${videosDeleted + videosFailed}/${videoIds.length}`);
    }
  }
  console.log(`  ✅ Deleted ${videosDeleted} videos (${videosFailed} failed)`);

  // 3. Clear DynamoDB assets table
  const dbDeleted = await clearDynamoDBAssets();

  // Summary
  console.log('\n📊 Summary:');
  console.log(`   - Cloudflare Images deleted: ${imagesDeleted}`);
  console.log(`   - Cloudflare Videos deleted: ${videosDeleted}`);
  console.log(`   - DynamoDB assets deleted: ${dbDeleted}`);
  console.log('\n✅ Cleanup complete!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
