/**
 * Admin utilities for CallyGo
 * Localhost-only operations for managing tenants and data
 */

import { QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EmailPK } from "./dynamodb";
import {
  getTenantById,
  deleteDomainLookup,
} from "./repositories/tenantRepository";

const LOG_PREFIX = "[DBG][admin]";

export interface DeleteTenantResult {
  tenantId: string;
  counts: {
    meta: number;
    calendarEvents: number;
    subscribers: number;
    contacts: number;
    transcripts: number;
    feedback: number;
    surveys: number;
    surveyResponses: number;
    products: number;
    emails: number;
    domainLookup: boolean;
  };
  totalDeleted: number;
}

/**
 * Categorize a sort key into an entity type for counting
 */
function categorizeSK(sk: string): keyof DeleteTenantResult["counts"] | null {
  if (sk === "META") return "meta";
  if (sk.startsWith("CALEVENT#")) return "calendarEvents";
  if (sk.startsWith("SUBSCRIBER#")) return "subscribers";
  if (sk.startsWith("CONTACT#")) return "contacts";
  if (sk.startsWith("TRANSCRIPT#")) return "transcripts";
  if (sk.startsWith("FEEDBACK#")) return "feedback";
  if (sk.startsWith("SURVEYRESP#")) return "surveyResponses";
  if (sk.startsWith("SURVEY#")) return "surveys";
  if (sk.startsWith("PRODUCT#")) return "products";
  return null;
}

/**
 * Batch delete items from a DynamoDB table in chunks of 25
 */
async function batchDeleteItems(
  tableName: string,
  keys: { PK: string; SK: string }[],
): Promise<number> {
  const BATCH_SIZE = 25;
  let deleted = 0;

  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    const batch = keys.slice(i, i + BATCH_SIZE);
    const deleteRequests = batch.map((key) => ({
      DeleteRequest: { Key: key },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: deleteRequests,
        },
      }),
    );

    deleted += batch.length;
    console.log(
      `${LOG_PREFIX} Batch deleted ${deleted}/${keys.length} from ${tableName}`,
    );
  }

  return deleted;
}

/**
 * Delete all data for a tenant across all tables.
 *
 * Targets:
 * - cally-main: All items with PK=TENANT#{tenantId} (META, events, subscribers, etc.)
 * - yoga-go-emails: All items with PK=INBOX#{tenantId}
 * - yoga-go-core: Domain lookup records (if tenant has domainConfig)
 */
export async function deleteTenantData(
  tenantId: string,
): Promise<DeleteTenantResult> {
  console.log(`${LOG_PREFIX} Starting deletion for tenant: ${tenantId}`);

  const counts: DeleteTenantResult["counts"] = {
    meta: 0,
    calendarEvents: 0,
    subscribers: 0,
    contacts: 0,
    transcripts: 0,
    feedback: 0,
    surveys: 0,
    surveyResponses: 0,
    products: 0,
    emails: 0,
    domainLookup: false,
  };

  // 1. Get tenant to check for domain config before deletion
  const tenant = await getTenantById(tenantId);
  if (!tenant) {
    console.log(`${LOG_PREFIX} Tenant not found: ${tenantId}`);
    return { tenantId, counts, totalDeleted: 0 };
  }

  // 2. Query ALL items under this tenant PK in cally-main
  console.log(`${LOG_PREFIX} Querying all items for tenant PK`);
  const coreKeys: { PK: string; SK: string }[] = [];
  let lastEvaluatedKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: Tables.CORE,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": TenantPK.TENANT(tenantId),
        },
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: lastEvaluatedKey,
      }),
    );

    for (const item of result.Items || []) {
      const sk = item.SK as string;
      coreKeys.push({ PK: item.PK as string, SK: sk });

      const category = categorizeSK(sk);
      if (category && category !== "domainLookup") {
        counts[category]++;
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (lastEvaluatedKey);

  console.log(
    `${LOG_PREFIX} Found ${coreKeys.length} items in cally-main for tenant`,
  );

  // 3. Batch delete cally-main items
  if (coreKeys.length > 0) {
    await batchDeleteItems(Tables.CORE, coreKeys);
  }

  // 4. Query and delete emails from yoga-go-emails
  console.log(`${LOG_PREFIX} Querying emails for tenant`);
  const emailKeys: { PK: string; SK: string }[] = [];
  let emailLastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: Tables.EMAILS,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
          ":pk": EmailPK.INBOX(tenantId),
        },
        ProjectionExpression: "PK, SK",
        ExclusiveStartKey: emailLastKey,
      }),
    );

    for (const item of result.Items || []) {
      emailKeys.push({ PK: item.PK as string, SK: item.SK as string });
    }

    emailLastKey = result.LastEvaluatedKey as
      | Record<string, unknown>
      | undefined;
  } while (emailLastKey);

  counts.emails = emailKeys.length;
  console.log(`${LOG_PREFIX} Found ${emailKeys.length} emails for tenant`);

  if (emailKeys.length > 0) {
    await batchDeleteItems(Tables.EMAILS, emailKeys);
  }

  // 5. Clean up domain lookup if tenant had a domain configured
  if (tenant.domainConfig?.domain) {
    console.log(
      `${LOG_PREFIX} Deleting domain lookup for: ${tenant.domainConfig.domain}`,
    );
    await deleteDomainLookup(tenant.domainConfig.domain, tenantId);
    counts.domainLookup = true;
  }

  const totalDeleted = coreKeys.length + emailKeys.length;
  console.log(
    `${LOG_PREFIX} Deletion complete for tenant ${tenantId}. Total: ${totalDeleted}`,
  );

  return { tenantId, counts, totalDeleted };
}
