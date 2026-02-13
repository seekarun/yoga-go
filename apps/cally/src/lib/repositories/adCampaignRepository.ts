/**
 * Ad Campaign Repository for CallyGo - DynamoDB Operations
 *
 * Storage patterns:
 * - Campaign:    PK="TENANT#{tenantId}", SK="AD_CAMPAIGN#{campaignId}"
 * - Ad Credit:   PK="TENANT#{tenantId}", SK="AD_CREDIT#META"
 * - Transaction: PK="TENANT#{tenantId}", SK="AD_TXN#{timestamp}#{txnId}"
 */

import {
  GetCommand,
  PutCommand,
  QueryCommand,
  DeleteCommand,
  UpdateCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { docClient, Tables, TenantPK, EntityType } from "../dynamodb";
import type {
  AdCampaign,
  AdCredit,
  AdTransaction,
  AdCampaignStatus,
  AdMetrics,
} from "@/types";
import { randomUUID } from "crypto";

// ============================================
// DynamoDB Item Types
// ============================================

interface DynamoDBCampaignItem extends AdCampaign {
  PK: string;
  SK: string;
  entityType: string;
}

interface DynamoDBCreditItem extends AdCredit {
  PK: string;
  SK: string;
  entityType: string;
}

interface DynamoDBTransactionItem extends AdTransaction {
  PK: string;
  SK: string;
  entityType: string;
}

// ============================================
// Helpers
// ============================================

function toCampaign(item: DynamoDBCampaignItem): AdCampaign {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...campaign } = item;
  return campaign;
}

function toCredit(item: DynamoDBCreditItem): AdCredit {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...credit } = item;
  return credit;
}

function toTransaction(item: DynamoDBTransactionItem): AdTransaction {
  const { PK: _PK, SK: _SK, entityType: _entityType, ...txn } = item;
  return txn;
}

// ============================================
// Campaign CRUD
// ============================================

export interface CreateAdCampaignInput {
  name: string;
  tenantId: string;
  goal: AdCampaign["goal"];
  platform: AdCampaign["platform"];
  bundleId: AdCampaign["bundleId"];
  budgetCents: number;
  targeting: AdCampaign["targeting"];
  creative: AdCampaign["creative"];
}

export async function createAdCampaign(
  tenantId: string,
  input: CreateAdCampaignInput,
): Promise<AdCampaign> {
  const now = new Date().toISOString();
  const campaignId = randomUUID();

  console.log(
    `[DBG][adCampaignRepo] Creating campaign "${input.name}" for tenant ${tenantId}`,
  );

  const campaign: AdCampaign = {
    id: campaignId,
    tenantId,
    name: input.name,
    goal: input.goal,
    platform: input.platform,
    bundleId: input.bundleId,
    budgetCents: input.budgetCents,
    status: "draft",
    targeting: input.targeting,
    creative: input.creative,
    createdAt: now,
    updatedAt: now,
  };

  const item: DynamoDBCampaignItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.AD_CAMPAIGN(campaignId),
    entityType: EntityType.AD_CAMPAIGN,
    ...campaign,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));

  console.log(
    `[DBG][adCampaignRepo] Created campaign ${campaignId} for tenant ${tenantId}`,
  );
  return campaign;
}

export async function getAdCampaignById(
  tenantId: string,
  campaignId: string,
): Promise<AdCampaign | null> {
  console.log(
    `[DBG][adCampaignRepo] Getting campaign ${campaignId} for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.AD_CAMPAIGN(campaignId),
      },
    }),
  );

  if (!result.Item) return null;
  return toCampaign(result.Item as DynamoDBCampaignItem);
}

export async function getAdCampaignsByTenant(
  tenantId: string,
): Promise<AdCampaign[]> {
  console.log(
    `[DBG][adCampaignRepo] Getting all campaigns for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.AD_CAMPAIGN_PREFIX,
      },
    }),
  );

  const campaigns = (result.Items || []).map((item) =>
    toCampaign(item as DynamoDBCampaignItem),
  );

  // Sort by createdAt desc (newest first)
  campaigns.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  console.log(
    `[DBG][adCampaignRepo] Found ${campaigns.length} campaigns for tenant ${tenantId}`,
  );
  return campaigns;
}

export async function updateAdCampaign(
  tenantId: string,
  campaignId: string,
  updates: Partial<
    Omit<AdCampaign, "id" | "tenantId" | "createdAt" | "bundleId">
  >,
): Promise<AdCampaign | null> {
  console.log(
    `[DBG][adCampaignRepo] Updating campaign ${campaignId} for tenant ${tenantId}`,
  );

  const existing = await getAdCampaignById(tenantId, campaignId);
  if (!existing) return null;

  const updated: AdCampaign = {
    ...existing,
    ...updates,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    bundleId: existing.bundleId,
    updatedAt: new Date().toISOString(),
  };

  const item: DynamoDBCampaignItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.AD_CAMPAIGN(campaignId),
    entityType: EntityType.AD_CAMPAIGN,
    ...updated,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));

  console.log(
    `[DBG][adCampaignRepo] Updated campaign ${campaignId} for tenant ${tenantId}`,
  );
  return updated;
}

export async function deleteAdCampaign(
  tenantId: string,
  campaignId: string,
): Promise<void> {
  console.log(
    `[DBG][adCampaignRepo] Deleting campaign ${campaignId} for tenant ${tenantId}`,
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.AD_CAMPAIGN(campaignId),
      },
    }),
  );

  console.log(
    `[DBG][adCampaignRepo] Deleted campaign ${campaignId} for tenant ${tenantId}`,
  );
}

// ============================================
// Ad Credit (atomic balance operations)
// ============================================

export async function getAdCredit(tenantId: string): Promise<AdCredit | null> {
  console.log(`[DBG][adCampaignRepo] Getting ad credit for tenant ${tenantId}`);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.AD_CREDIT,
      },
    }),
  );

  if (!result.Item) return null;
  return toCredit(result.Item as DynamoDBCreditItem);
}

export async function upsertAdCredit(
  tenantId: string,
  credit: AdCredit,
): Promise<void> {
  console.log(
    `[DBG][adCampaignRepo] Upserting ad credit for tenant ${tenantId}`,
  );

  const item: DynamoDBCreditItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.AD_CREDIT,
    entityType: EntityType.AD_CREDIT,
    ...credit,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));
}

/**
 * Atomically adjust ad credit balance using ADD operation.
 * Use positive values for credits, negative for debits.
 * Returns the new balance after adjustment.
 */
export async function adjustAdCreditBalance(
  tenantId: string,
  adjustmentCents: number,
  field: "totalPurchasedCents" | "totalSpentCents",
): Promise<number> {
  console.log(
    `[DBG][adCampaignRepo] Adjusting ad credit for tenant ${tenantId} by ${adjustmentCents}`,
  );

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: TenantPK.TENANT(tenantId),
        SK: TenantPK.AD_CREDIT,
      },
      UpdateExpression:
        "SET entityType = :et, tenantId = :tid, updatedAt = :now ADD balanceCents :adj, #field :absAdj",
      ExpressionAttributeNames: {
        "#field": field,
      },
      ExpressionAttributeValues: {
        ":et": EntityType.AD_CREDIT,
        ":tid": tenantId,
        ":now": new Date().toISOString(),
        ":adj": adjustmentCents,
        ":absAdj": Math.abs(adjustmentCents),
      },
      ReturnValues: "ALL_NEW",
    }),
  );

  const newBalance = (result.Attributes?.balanceCents as number) ?? 0;
  console.log(
    `[DBG][adCampaignRepo] New balance for tenant ${tenantId}: ${newBalance}`,
  );
  return newBalance;
}

// ============================================
// Ad Transactions
// ============================================

export async function createAdTransaction(
  tenantId: string,
  input: Omit<AdTransaction, "id" | "tenantId" | "createdAt">,
): Promise<AdTransaction> {
  const now = new Date().toISOString();
  const txnId = randomUUID();

  console.log(
    `[DBG][adCampaignRepo] Creating ad transaction for tenant ${tenantId}: ${input.type} ${input.amountCents}`,
  );

  const txn: AdTransaction = {
    id: txnId,
    tenantId,
    type: input.type,
    amountCents: input.amountCents,
    balanceAfterCents: input.balanceAfterCents,
    description: input.description,
    campaignId: input.campaignId,
    stripeSessionId: input.stripeSessionId,
    bundleId: input.bundleId,
    createdAt: now,
  };

  const item: DynamoDBTransactionItem = {
    PK: TenantPK.TENANT(tenantId),
    SK: TenantPK.AD_TRANSACTION(now, txnId),
    entityType: EntityType.AD_TRANSACTION,
    ...txn,
  };

  await docClient.send(new PutCommand({ TableName: Tables.CORE, Item: item }));

  console.log(
    `[DBG][adCampaignRepo] Created transaction ${txnId} for tenant ${tenantId}`,
  );
  return txn;
}

export async function getAdTransactions(
  tenantId: string,
  limit = 50,
): Promise<AdTransaction[]> {
  console.log(
    `[DBG][adCampaignRepo] Getting ad transactions for tenant ${tenantId}`,
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: "PK = :pk AND begins_with(SK, :skPrefix)",
      ExpressionAttributeValues: {
        ":pk": TenantPK.TENANT(tenantId),
        ":skPrefix": TenantPK.AD_TRANSACTION_PREFIX,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );

  const txns = (result.Items || []).map((item) =>
    toTransaction(item as DynamoDBTransactionItem),
  );

  console.log(
    `[DBG][adCampaignRepo] Found ${txns.length} transactions for tenant ${tenantId}`,
  );
  return txns;
}

// ============================================
// Cron Helper: Get all active campaigns across tenants
// ============================================

export async function getActiveCampaignsAllTenants(): Promise<AdCampaign[]> {
  console.log("[DBG][adCampaignRepo] Scanning all active campaigns");

  const result = await docClient.send(
    new ScanCommand({
      TableName: Tables.CORE,
      FilterExpression: "entityType = :et AND #status = :activeStatus",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":et": EntityType.AD_CAMPAIGN,
        ":activeStatus": "active" as AdCampaignStatus,
      },
    }),
  );

  const campaigns = (result.Items || []).map((item) =>
    toCampaign(item as DynamoDBCampaignItem),
  );

  console.log(
    `[DBG][adCampaignRepo] Found ${campaigns.length} active campaigns across all tenants`,
  );
  return campaigns;
}

// ============================================
// Campaign Metrics Update
// ============================================

export async function updateCampaignMetrics(
  tenantId: string,
  campaignId: string,
  metrics: AdMetrics,
  status?: AdCampaignStatus,
): Promise<AdCampaign | null> {
  const updates: Partial<AdCampaign> = {
    metrics,
  };

  if (status) {
    updates.status = status;
    if (status === "completed") {
      updates.completedAt = new Date().toISOString();
    }
  }

  return updateAdCampaign(tenantId, campaignId, updates);
}
