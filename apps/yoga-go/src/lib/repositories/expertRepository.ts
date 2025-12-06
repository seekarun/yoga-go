/**
 * Expert Repository - DynamoDB Operations
 *
 * Single-table design:
 * - PK: "EXPERT"
 * - SK: expertId
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType } from '../dynamodb';
import type { Expert } from '@/types';

// Type for DynamoDB Expert item (includes PK/SK)
interface DynamoDBExpertItem extends Expert {
  PK: string;
  SK: string;
}

// Type for creating a new expert
export interface CreateExpertInput {
  id: string;
  userId: string;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  rating?: number;
  totalCourses?: number;
  totalStudents?: number;
  specializations?: string[];
  featured?: boolean;
  certifications?: string[];
  experience?: string;
  socialLinks?: Expert['socialLinks'];
  onboardingCompleted?: boolean;
  platformPreferences?: Expert['platformPreferences'];
}

/**
 * Convert DynamoDB item to Expert type (removes PK/SK)
 */
function toExpert(item: DynamoDBExpertItem): Expert {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...expert } = item;
  return expert as Expert;
}

/**
 * Get expert by ID
 */
export async function getExpertById(expertId: string): Promise<Expert | null> {
  console.log('[DBG][expertRepository] Getting expert by id:', expertId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.EXPERT,
        SK: expertId,
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][expertRepository] Expert not found');
    return null;
  }

  console.log('[DBG][expertRepository] Found expert:', expertId);
  return toExpert(result.Item as DynamoDBExpertItem);
}

/**
 * Get all experts
 */
export async function getAllExperts(): Promise<Expert[]> {
  console.log('[DBG][expertRepository] Getting all experts');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EntityType.EXPERT,
      },
    })
  );

  const experts = (result.Items || []).map(item => toExpert(item as DynamoDBExpertItem));
  console.log('[DBG][expertRepository] Found', experts.length, 'experts');
  return experts;
}

/**
 * Get expert by user ID (cognitoSub)
 */
export async function getExpertByUserId(userId: string): Promise<Expert | null> {
  console.log('[DBG][expertRepository] Getting expert by userId:', userId);

  // Query all experts and filter by userId (no GSI)
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':pk': EntityType.EXPERT,
        ':userId': userId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][expertRepository] Expert not found for userId');
    return null;
  }

  console.log('[DBG][expertRepository] Found expert for userId:', userId);
  return toExpert(result.Items[0] as DynamoDBExpertItem);
}

/**
 * Create a new expert in DynamoDB
 */
export async function createExpert(input: CreateExpertInput): Promise<Expert> {
  const now = new Date().toISOString();

  console.log('[DBG][expertRepository] Creating expert:', input.id, 'name:', input.name);

  const expert: DynamoDBExpertItem = {
    PK: EntityType.EXPERT,
    SK: input.id,
    id: input.id,
    userId: input.userId,
    name: input.name,
    title: input.title,
    bio: input.bio,
    avatar: input.avatar,
    rating: input.rating ?? 0,
    totalCourses: input.totalCourses ?? 0,
    totalStudents: input.totalStudents ?? 0,
    specializations: input.specializations ?? [],
    featured: input.featured ?? false,
    certifications: input.certifications ?? [],
    experience: input.experience ?? '',
    socialLinks: input.socialLinks ?? {},
    onboardingCompleted: input.onboardingCompleted ?? false,
    platformPreferences: input.platformPreferences ?? {
      featuredOnPlatform: true,
      defaultEmail: `${input.id}@myyoga.guru`,
    },
    liveStreamingEnabled: true,
    totalLiveSessions: 0,
    upcomingLiveSessions: 0,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: expert,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    })
  );

  console.log('[DBG][expertRepository] Created expert:', input.id);
  return toExpert(expert);
}

/**
 * Update expert - partial update using UpdateCommand
 */
export async function updateExpert(expertId: string, updates: Partial<Expert>): Promise<Expert> {
  console.log('[DBG][expertRepository] Updating expert:', expertId);

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'PK' && key !== 'SK') {
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
        PK: EntityType.EXPERT,
        SK: expertId,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][expertRepository] Updated expert:', expertId);
  return toExpert(result.Attributes as DynamoDBExpertItem);
}

/**
 * Delete expert
 */
export async function deleteExpert(expertId: string): Promise<void> {
  console.log('[DBG][expertRepository] Deleting expert:', expertId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.EXPERT,
        SK: expertId,
      },
    })
  );

  console.log('[DBG][expertRepository] Deleted expert:', expertId);
}

/**
 * Update expert statistics (totalCourses, totalStudents)
 */
export async function updateExpertStats(
  expertId: string,
  stats: { totalCourses?: number; totalStudents?: number }
): Promise<Expert> {
  console.log('[DBG][expertRepository] Updating expert stats:', expertId, stats);

  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  if (stats.totalCourses !== undefined) {
    updateParts.push('#tc = :tc');
    exprAttrNames['#tc'] = 'totalCourses';
    exprAttrValues[':tc'] = stats.totalCourses;
  }

  if (stats.totalStudents !== undefined) {
    updateParts.push('#ts = :ts');
    exprAttrNames['#ts'] = 'totalStudents';
    exprAttrValues[':ts'] = stats.totalStudents;
  }

  updateParts.push('#updatedAt = :updatedAt');
  exprAttrNames['#updatedAt'] = 'updatedAt';
  exprAttrValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.EXPERT,
        SK: expertId,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][expertRepository] Updated expert stats');
  return toExpert(result.Attributes as DynamoDBExpertItem);
}

/**
 * Set expert as featured
 */
export async function setFeatured(expertId: string, featured: boolean): Promise<Expert> {
  console.log('[DBG][expertRepository] Setting expert featured:', expertId, featured);
  return updateExpert(expertId, { featured });
}

/**
 * Update expert landing page config
 */
export async function updateLandingPage(
  expertId: string,
  landingPage: Expert['customLandingPage']
): Promise<Expert> {
  console.log('[DBG][expertRepository] Updating expert landing page:', expertId);
  return updateExpert(expertId, { customLandingPage: landingPage });
}

/**
 * Get featured experts
 */
export async function getFeaturedExperts(): Promise<Expert[]> {
  console.log('[DBG][expertRepository] Getting featured experts');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'featured = :featured',
      ExpressionAttributeValues: {
        ':pk': EntityType.EXPERT,
        ':featured': true,
      },
    })
  );

  const experts = (result.Items || []).map(item => toExpert(item as DynamoDBExpertItem));
  console.log('[DBG][expertRepository] Found', experts.length, 'featured experts');
  return experts;
}
