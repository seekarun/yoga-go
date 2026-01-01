/**
 * Lesson Repository - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "LESSON#{courseId}#{lessonId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import type { Lesson } from '@/types';

// Extended Lesson type with courseId for storage
interface LessonWithCourseId extends Lesson {
  courseId: string;
}

// Type for DynamoDB Lesson item (includes PK/SK)
interface DynamoDBLessonItem extends LessonWithCourseId {
  PK: string;
  SK: string;
  createdAt: string;
  updatedAt: string;
}

// Type for creating a new lesson
export interface CreateLessonInput {
  id: string;
  courseId: string;
  title: string;
  duration: string;
  isFree?: boolean;
  description?: string;
  videoUrl?: string; // Deprecated
  cloudflareVideoId?: string;
  cloudflareVideoStatus?: 'uploading' | 'processing' | 'ready' | 'error';
  resources?: string[];
  completed?: boolean;
  locked?: boolean;
}

/**
 * Convert DynamoDB item to Lesson type with courseId
 */
function toLesson(item: DynamoDBLessonItem): LessonWithCourseId {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...lesson } = item;
  return lesson as LessonWithCourseId;
}

/**
 * Get lesson by courseId and lessonId
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 */
export async function getLessonById(
  tenantId: string,
  courseId: string,
  lessonId: string
): Promise<LessonWithCourseId | null> {
  console.log(
    '[DBG][lessonRepository] Getting lesson:',
    lessonId,
    'for course:',
    courseId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.LESSON(courseId, lessonId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][lessonRepository] Lesson not found');
    return null;
  }

  console.log('[DBG][lessonRepository] Found lesson:', lessonId);
  return toLesson(result.Item as DynamoDBLessonItem);
}

/**
 * Get all lessons for a course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function getLessonsByCourseId(
  tenantId: string,
  courseId: string
): Promise<LessonWithCourseId[]> {
  console.log('[DBG][lessonRepository] Getting lessons for course:', courseId, 'tenant:', tenantId);

  // Query lessons where SK begins with LESSON#{courseId}#
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `LESSON#${courseId}#`,
      },
    })
  );

  const lessons = (result.Items || []).map(item => toLesson(item as DynamoDBLessonItem));
  console.log('[DBG][lessonRepository] Found', lessons.length, 'lessons for course:', courseId);
  return lessons;
}

/**
 * Get all lessons for a tenant (across all courses)
 * @param tenantId - The tenant ID (expertId)
 */
export async function getTenantLessons(tenantId: string): Promise<LessonWithCourseId[]> {
  console.log('[DBG][lessonRepository] Getting all lessons for tenant:', tenantId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'LESSON#',
      },
    })
  );

  const lessons = (result.Items || []).map(item => toLesson(item as DynamoDBLessonItem));
  console.log('[DBG][lessonRepository] Found', lessons.length, 'total lessons');
  return lessons;
}

/**
 * Create a new lesson
 * @param tenantId - The tenant ID (expertId)
 * @param input - Lesson creation input
 */
export async function createLesson(
  tenantId: string,
  input: CreateLessonInput
): Promise<LessonWithCourseId> {
  const now = new Date().toISOString();

  console.log(
    '[DBG][lessonRepository] Creating lesson:',
    input.id,
    'for course:',
    input.courseId,
    'tenant:',
    tenantId
  );

  const lesson: DynamoDBLessonItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.LESSON(input.courseId, input.id),
    id: input.id,
    courseId: input.courseId,
    title: input.title,
    duration: input.duration,
    isFree: input.isFree ?? false,
    description: input.description ?? '',
    videoUrl: input.videoUrl ?? '', // Deprecated
    cloudflareVideoId: input.cloudflareVideoId ?? '',
    cloudflareVideoStatus: input.cloudflareVideoStatus,
    resources: input.resources ?? [],
    completed: input.completed ?? false,
    locked: input.locked ?? false,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: lesson,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    })
  );

  console.log('[DBG][lessonRepository] Created lesson:', input.id);
  return toLesson(lesson);
}

/**
 * Update lesson - partial update
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @param updates - Partial lesson updates
 */
export async function updateLesson(
  tenantId: string,
  courseId: string,
  lessonId: string,
  updates: Partial<Lesson>
): Promise<LessonWithCourseId> {
  console.log(
    '[DBG][lessonRepository] Updating lesson:',
    lessonId,
    'for course:',
    courseId,
    'tenant:',
    tenantId
  );

  // Build update expression dynamically
  const updateParts: string[] = [];
  const exprAttrNames: Record<string, string> = {};
  const exprAttrValues: Record<string, unknown> = {};

  let index = 0;
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && key !== 'id' && key !== 'courseId' && key !== 'PK' && key !== 'SK') {
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
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.LESSON(courseId, lessonId),
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][lessonRepository] Updated lesson:', lessonId);
  return toLesson(result.Attributes as DynamoDBLessonItem);
}

/**
 * Delete a lesson
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 */
export async function deleteLesson(
  tenantId: string,
  courseId: string,
  lessonId: string
): Promise<void> {
  console.log(
    '[DBG][lessonRepository] Deleting lesson:',
    lessonId,
    'from course:',
    courseId,
    'tenant:',
    tenantId
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.LESSON(courseId, lessonId),
      },
    })
  );

  console.log('[DBG][lessonRepository] Deleted lesson:', lessonId);
}

/**
 * Delete all lessons for a course (batch delete)
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function deleteLessonsByCourseId(tenantId: string, courseId: string): Promise<number> {
  console.log(
    '[DBG][lessonRepository] Deleting all lessons for course:',
    courseId,
    'tenant:',
    tenantId
  );

  // First, get all lessons for the course
  const lessons = await getLessonsByCourseId(tenantId, courseId);

  if (lessons.length === 0) {
    console.log('[DBG][lessonRepository] No lessons found for course:', courseId);
    return 0;
  }

  // DynamoDB BatchWriteCommand can handle max 25 items at a time
  const batchSize = 25;
  let deletedCount = 0;

  for (let i = 0; i < lessons.length; i += batchSize) {
    const batch = lessons.slice(i, i + batchSize);

    const deleteRequests = batch.map(lesson => ({
      DeleteRequest: {
        Key: {
          PK: CorePK.TENANT(tenantId),
          SK: CorePK.LESSON(courseId, lesson.id),
        },
      },
    }));

    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [Tables.CORE]: deleteRequests,
        },
      })
    );

    deletedCount += batch.length;
  }

  console.log('[DBG][lessonRepository] Deleted', deletedCount, 'lessons for course:', courseId);
  return deletedCount;
}

/**
 * Count lessons for a course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function countLessonsByCourseId(tenantId: string, courseId: string): Promise<number> {
  const lessons = await getLessonsByCourseId(tenantId, courseId);
  return lessons.length;
}

/**
 * Get free lessons for a course
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 */
export async function getFreeLessonsByCourseId(
  tenantId: string,
  courseId: string
): Promise<LessonWithCourseId[]> {
  console.log(
    '[DBG][lessonRepository] Getting free lessons for course:',
    courseId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'isFree = :isFree',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `LESSON#${courseId}#`,
        ':isFree': true,
      },
    })
  );

  const lessons = (result.Items || []).map(item => toLesson(item as DynamoDBLessonItem));
  console.log('[DBG][lessonRepository] Found', lessons.length, 'free lessons');
  return lessons;
}

/**
 * Update lesson video status (for Cloudflare video processing)
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @param status - Video status
 * @param cloudflareVideoId - Optional video ID
 */
export async function updateLessonVideoStatus(
  tenantId: string,
  courseId: string,
  lessonId: string,
  status: 'uploading' | 'processing' | 'ready' | 'error',
  cloudflareVideoId?: string
): Promise<LessonWithCourseId> {
  console.log('[DBG][lessonRepository] Updating video status for lesson:', lessonId, 'to:', status);

  const updates: Partial<Lesson> = { cloudflareVideoStatus: status };
  if (cloudflareVideoId) {
    updates.cloudflareVideoId = cloudflareVideoId;
  }

  return updateLesson(tenantId, courseId, lessonId, updates);
}

/**
 * Mark lesson as completed for a user
 * Note: This updates the lesson itself - for user-specific progress, use a separate progress table
 * @param tenantId - The tenant ID (expertId)
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @param completed - Completion flag
 */
export async function markLessonCompleted(
  tenantId: string,
  courseId: string,
  lessonId: string,
  completed: boolean = true
): Promise<LessonWithCourseId> {
  console.log('[DBG][lessonRepository] Marking lesson:', lessonId, 'as completed:', completed);

  const updates: Partial<Lesson> = {
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  };

  return updateLesson(tenantId, courseId, lessonId, updates);
}

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES
// ===================================================================

/** @deprecated Use getTenantLessons(tenantId) instead */
export async function getAllLessons(): Promise<LessonWithCourseId[]> {
  console.warn(
    '[DBG][lessonRepository] getAllLessons() is deprecated - use getTenantLessons(tenantId)'
  );
  return [];
}
