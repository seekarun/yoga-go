/**
 * Boost repository for DynamoDB operations
 * Handles CRUD operations for boost campaigns
 *
 * BOOST Table Access Patterns:
 * - Boosts by expert: PK=EXPERT#{expertId}, SK=BOOST#{createdAt}#{boostId}
 * - Boost direct lookup: PK=BOOST#{boostId}, SK=META
 * - Active boosts (GSI1): GSI1PK=STATUS#{status}, GSI1SK={createdAt}#{boostId}
 */

import { docClient, Tables, BoostPK, EntityType } from '../dynamodb';
import { GetCommand, QueryCommand, BatchWriteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { Boost, BoostStatus, BoostListResult } from '@/types';

// Helper to generate unique boost ID
const generateBoostId = () => `boost_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new boost campaign
 */
export async function createBoost(
  input: Omit<Boost, 'id' | 'createdAt' | 'updatedAt' | 'spentAmount'>
): Promise<Boost> {
  console.log('[DBG][boostRepository] Creating boost for expert:', input.expertId);

  const now = new Date().toISOString();
  const boostId = generateBoostId();

  const boost: Boost = {
    ...input,
    id: boostId,
    spentAmount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Expert partition and direct lookup
  const writeRequests = [
    // 1. Boost in expert partition for listing
    {
      PutRequest: {
        Item: {
          PK: BoostPK.EXPERT(input.expertId),
          SK: `BOOST#${now}#${boostId}`,
          entityType: EntityType.BOOST,
          GSI1PK: `STATUS#${input.status}`,
          GSI1SK: `${now}#${boostId}`,
          ...boost,
        },
      },
    },
    // 2. Direct boost lookup
    {
      PutRequest: {
        Item: {
          PK: BoostPK.BOOST(boostId),
          SK: 'META',
          entityType: EntityType.BOOST,
          GSI1PK: `STATUS#${input.status}`,
          GSI1SK: `${now}#${boostId}`,
          ...boost,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.BOOST]: writeRequests,
      },
    })
  );

  console.log('[DBG][boostRepository] Boost created:', boostId);
  return boost;
}

/**
 * Get a boost by ID
 */
export async function getBoostById(boostId: string): Promise<Boost | null> {
  console.log('[DBG][boostRepository] Getting boost:', boostId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.BOOST,
      Key: {
        PK: BoostPK.BOOST(boostId),
        SK: 'META',
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][boostRepository] Boost not found:', boostId);
    return null;
  }

  return mapToBoost(result.Item);
}

/**
 * Get all boosts for an expert
 */
export async function getBoostsByExpert(
  expertId: string,
  limit: number = 20
): Promise<BoostListResult> {
  console.log('[DBG][boostRepository] Getting boosts for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.BOOST,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': BoostPK.EXPERT(expertId),
        ':skPrefix': 'BOOST#',
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit,
    })
  );

  const boosts = (result.Items || []).map(mapToBoost);
  const activeCount = boosts.filter(b => b.status === 'active').length;

  console.log('[DBG][boostRepository] Found', boosts.length, 'boosts,', activeCount, 'active');

  return {
    boosts,
    totalCount: boosts.length,
    activeCount,
    lastKey: result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : undefined,
  };
}

/**
 * Update boost status
 */
export async function updateBoostStatus(
  boostId: string,
  status: BoostStatus,
  additionalUpdates?: {
    statusMessage?: string;
    submittedAt?: string;
    approvedAt?: string;
    pausedAt?: string;
    completedAt?: string;
    metaCampaignId?: string;
    metaAdSetId?: string;
    metaAdId?: string;
  }
): Promise<Boost | null> {
  console.log('[DBG][boostRepository] Updating boost status:', boostId, status);

  // Get current boost
  const currentBoost = await getBoostById(boostId);
  if (!currentBoost) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedBoost: Boost = {
    ...currentBoost,
    status,
    updatedAt: now,
    ...additionalUpdates,
  };

  // Update both copies
  const writeRequests = [
    // Direct lookup
    {
      PutRequest: {
        Item: {
          PK: BoostPK.BOOST(boostId),
          SK: 'META',
          entityType: EntityType.BOOST,
          GSI1PK: `STATUS#${status}`,
          GSI1SK: `${currentBoost.createdAt}#${boostId}`,
          ...updatedBoost,
        },
      },
    },
    // Expert partition
    {
      PutRequest: {
        Item: {
          PK: BoostPK.EXPERT(currentBoost.expertId),
          SK: `BOOST#${currentBoost.createdAt}#${boostId}`,
          entityType: EntityType.BOOST,
          GSI1PK: `STATUS#${status}`,
          GSI1SK: `${currentBoost.createdAt}#${boostId}`,
          ...updatedBoost,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.BOOST]: writeRequests,
      },
    })
  );

  console.log('[DBG][boostRepository] Boost status updated:', boostId);
  return updatedBoost;
}

/**
 * Update boost metrics
 */
export async function updateBoostMetrics(
  boostId: string,
  metrics: Boost['metrics']
): Promise<void> {
  console.log('[DBG][boostRepository] Updating boost metrics:', boostId);

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.BOOST,
      Key: {
        PK: BoostPK.BOOST(boostId),
        SK: 'META',
      },
      UpdateExpression: 'SET metrics = :metrics, updatedAt = :now',
      ExpressionAttributeValues: {
        ':metrics': metrics,
        ':now': now,
      },
    })
  );

  console.log('[DBG][boostRepository] Boost metrics updated');
}

/**
 * Update boost spent amount
 */
export async function updateBoostSpend(boostId: string, spentAmount: number): Promise<void> {
  console.log('[DBG][boostRepository] Updating boost spend:', boostId, spentAmount);

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.BOOST,
      Key: {
        PK: BoostPK.BOOST(boostId),
        SK: 'META',
      },
      UpdateExpression: 'SET spentAmount = :spent, updatedAt = :now',
      ExpressionAttributeValues: {
        ':spent': spentAmount,
        ':now': now,
      },
    })
  );

  console.log('[DBG][boostRepository] Boost spend updated');
}

/**
 * Get active boosts (for cron job to sync metrics)
 */
export async function getActiveBoosts(limit: number = 100): Promise<Boost[]> {
  console.log('[DBG][boostRepository] Getting active boosts');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.BOOST,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :status',
      ExpressionAttributeValues: {
        ':status': 'STATUS#active',
      },
      Limit: limit,
    })
  );

  const boosts = (result.Items || []).map(mapToBoost);
  console.log('[DBG][boostRepository] Found', boosts.length, 'active boosts');

  return boosts;
}

/**
 * Map DynamoDB item to Boost type
 */
function mapToBoost(item: Record<string, unknown>): Boost {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    goal: item.goal as Boost['goal'],
    courseId: item.courseId as string | undefined,
    budget: item.budget as number,
    dailyBudget: item.dailyBudget as number | undefined,
    spentAmount: item.spentAmount as number,
    currency: item.currency as string,
    status: item.status as Boost['status'],
    statusMessage: item.statusMessage as string | undefined,
    startDate: item.startDate as string | undefined,
    endDate: item.endDate as string | undefined,
    targeting: item.targeting as Boost['targeting'],
    creative: item.creative as Boost['creative'],
    alternativeCreatives: item.alternativeCreatives as Boost['creative'][] | undefined,
    metaCampaignId: item.metaCampaignId as string | undefined,
    metaAdSetId: item.metaAdSetId as string | undefined,
    metaAdId: item.metaAdId as string | undefined,
    metrics: item.metrics as Boost['metrics'] | undefined,
    submittedAt: item.submittedAt as string | undefined,
    approvedAt: item.approvedAt as string | undefined,
    pausedAt: item.pausedAt as string | undefined,
    completedAt: item.completedAt as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
