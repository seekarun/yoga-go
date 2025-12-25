/**
 * Migration script: Move emails from yoga-go-core to yoga-go-emails
 *
 * Run with: npx ts-node scripts/migrate-emails.ts
 */

import { DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';

const client = new DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(client);

const SOURCE_TABLE = 'yoga-go-core';
const TARGET_TABLE = 'yoga-go-emails';

async function migrateEmails() {
  console.log('Starting email migration...');
  console.log(`Source: ${SOURCE_TABLE}`);
  console.log(`Target: ${TARGET_TABLE}`);

  // Scan all EMAIL# items from source table
  let lastEvaluatedKey: Record<string, unknown> | undefined;
  let totalItems = 0;
  let migratedItems = 0;

  do {
    const scanResult = await client.send(
      new ScanCommand({
        TableName: SOURCE_TABLE,
        FilterExpression: 'begins_with(PK, :pk)',
        ExpressionAttributeValues: {
          ':pk': { S: 'EMAIL#' },
        },
        ExclusiveStartKey: lastEvaluatedKey as Record<string, { S: string }> | undefined,
      })
    );

    const items = scanResult.Items || [];
    totalItems += items.length;
    console.log(`Found ${items.length} items in this batch`);

    if (items.length === 0) {
      lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
      continue;
    }

    // Transform and batch write to target table (max 25 items per batch)
    const batchSize = 25;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);

      const writeRequests = batch.map(item => {
        // Unmarshall to plain JS object
        const plainItem = unmarshall(item);

        // Transform PK: EMAIL#{expertId} -> INBOX#{expertId}
        const oldPK = plainItem.PK as string;
        const expertId = oldPK.replace('EMAIL#', '');
        plainItem.PK = `INBOX#${expertId}`;

        return {
          PutRequest: {
            Item: plainItem,
          },
        };
      });

      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TARGET_TABLE]: writeRequests,
          },
        })
      );

      migratedItems += batch.length;
      console.log(`Migrated ${migratedItems}/${totalItems} items`);
    }

    lastEvaluatedKey = scanResult.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastEvaluatedKey);

  console.log('\nMigration complete!');
  console.log(`Total items migrated: ${migratedItems}`);
}

// Verify migration
async function verifyMigration() {
  console.log('\nVerifying migration...');

  // Count items in target table
  const scanResult = await client.send(
    new ScanCommand({
      TableName: TARGET_TABLE,
      FilterExpression: 'begins_with(PK, :pk)',
      ExpressionAttributeValues: {
        ':pk': { S: 'INBOX#' },
      },
      Select: 'COUNT',
    })
  );

  console.log(`Items in ${TARGET_TABLE}: ${scanResult.Count}`);
}

async function main() {
  try {
    await migrateEmails();
    await verifyMigration();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();
