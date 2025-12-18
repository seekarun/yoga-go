/**
 * Migration script: Move assets from yoga-go-core to yoga-go-assets table
 *
 * Run with: AWS_PROFILE=myg npx tsx scripts/migrate-assets-to-new-table.ts
 *
 * Options:
 *   --dry-run    Preview changes without writing to the new table
 *   --delete     Delete assets from core table after successful migration
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

const REGION = "ap-southeast-2";
const CORE_TABLE = "yoga-go-core";
const ASSETS_TABLE = "yoga-go-assets";

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const shouldDelete = args.includes("--delete");

// Create DynamoDB client
const client = new DynamoDBClient({ region: REGION });
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

interface AssetItem {
  PK: string;
  SK: string;
  entityType: string;
  GSI1PK?: string;
  GSI1SK?: string;
  GSI2PK?: string;
  GSI2SK?: string;
  GSI3PK?: string;
  GSI3SK?: string;
  [key: string]: unknown;
}

async function scanAssetsFromCoreTable(): Promise<AssetItem[]> {
  console.log("[DBG][migrate] Scanning core table for assets...");

  const assets: AssetItem[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new ScanCommand({
        TableName: CORE_TABLE,
        FilterExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": "ASSET",
        },
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    if (result.Items) {
      assets.push(...(result.Items as AssetItem[]));
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  console.log(`[DBG][migrate] Found ${assets.length} assets in core table`);
  return assets;
}

async function migrateAssetToNewTable(asset: AssetItem): Promise<boolean> {
  if (isDryRun) {
    console.log(`[DBG][migrate] [DRY-RUN] Would migrate asset: ${asset.SK}`);
    return true;
  }

  try {
    await docClient.send(
      new PutCommand({
        TableName: ASSETS_TABLE,
        Item: asset,
        ConditionExpression: "attribute_not_exists(PK)",
      }),
    );
    console.log(`[DBG][migrate] ✓ Migrated asset: ${asset.SK}`);
    return true;
  } catch (error: unknown) {
    if (
      (error as { name?: string }).name === "ConditionalCheckFailedException"
    ) {
      console.log(
        `[DBG][migrate] ⚠ Asset already exists in new table: ${asset.SK}`,
      );
      return true; // Consider it a success since it's already there
    }
    console.error(
      `[DBG][migrate] ✗ Failed to migrate asset ${asset.SK}:`,
      error,
    );
    return false;
  }
}

async function deleteAssetFromCoreTable(asset: AssetItem): Promise<boolean> {
  if (isDryRun) {
    console.log(
      `[DBG][migrate] [DRY-RUN] Would delete asset from core: ${asset.SK}`,
    );
    return true;
  }

  try {
    await docClient.send(
      new DeleteCommand({
        TableName: CORE_TABLE,
        Key: {
          PK: asset.PK,
          SK: asset.SK,
        },
      }),
    );
    console.log(`[DBG][migrate] ✓ Deleted asset from core table: ${asset.SK}`);
    return true;
  } catch (error) {
    console.error(
      `[DBG][migrate] ✗ Failed to delete asset ${asset.SK}:`,
      error,
    );
    return false;
  }
}

async function migrate() {
  console.log("=".repeat(60));
  console.log("Asset Migration: yoga-go-core -> yoga-go-assets");
  console.log("=".repeat(60));
  console.log(`Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(
    `Delete from core after migration: ${shouldDelete ? "YES" : "NO"}`,
  );
  console.log("=".repeat(60));

  try {
    // Step 1: Scan all assets from core table
    const assets = await scanAssetsFromCoreTable();

    if (assets.length === 0) {
      console.log("\n[DBG][migrate] No assets found to migrate. Done!");
      return;
    }

    // Step 2: Migrate each asset to the new table
    let migratedCount = 0;
    let failedCount = 0;
    let deletedCount = 0;

    for (const asset of assets) {
      const migrated = await migrateAssetToNewTable(asset);

      if (migrated) {
        migratedCount++;

        // Step 3: Optionally delete from core table
        if (shouldDelete) {
          const deleted = await deleteAssetFromCoreTable(asset);
          if (deleted) {
            deletedCount++;
          }
        }
      } else {
        failedCount++;
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("Migration Summary");
    console.log("=".repeat(60));
    console.log(`Total assets found: ${assets.length}`);
    console.log(`Successfully migrated: ${migratedCount}`);
    console.log(`Failed to migrate: ${failedCount}`);
    if (shouldDelete) {
      console.log(`Deleted from core table: ${deletedCount}`);
    }
    console.log("=".repeat(60));

    if (isDryRun) {
      console.log("\n[DBG][migrate] This was a DRY RUN. No changes were made.");
      console.log(
        "[DBG][migrate] Run without --dry-run to perform actual migration.",
      );
    }

    if (failedCount > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("[DBG][migrate] Migration failed:", error);
    process.exit(1);
  }
}

migrate();
