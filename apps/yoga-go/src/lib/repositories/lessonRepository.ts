/**
 * Lesson Repository - DynamoDB Operations
 *
 * Single-table design:
 * - PK: "LESSON"
 * - SK: {courseId}#{lessonId}
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, EntityType } from '../dynamodb';
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
 * Build sort key for lesson
 */
function buildSK(courseId: string, lessonId: string): string {
  return `${courseId}#${lessonId}`;
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
 */
export async function getLessonById(
  courseId: string,
  lessonId: string
): Promise<LessonWithCourseId | null> {
  console.log('[DBG][lessonRepository] Getting lesson:', lessonId, 'for course:', courseId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.LESSON,
        SK: buildSK(courseId, lessonId),
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
 */
export async function getLessonsByCourseId(courseId: string): Promise<LessonWithCourseId[]> {
  console.log('[DBG][lessonRepository] Getting lessons for course:', courseId);

  // Query lessons where SK begins with courseId#
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': EntityType.LESSON,
        ':skPrefix': `${courseId}#`,
      },
    })
  );

  const lessons = (result.Items || []).map(item => toLesson(item as DynamoDBLessonItem));
  console.log('[DBG][lessonRepository] Found', lessons.length, 'lessons for course:', courseId);
  return lessons;
}

/**
 * Get all lessons (across all courses)
 */
export async function getAllLessons(): Promise<LessonWithCourseId[]> {
  console.log('[DBG][lessonRepository] Getting all lessons');

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': EntityType.LESSON,
      },
    })
  );

  const lessons = (result.Items || []).map(item => toLesson(item as DynamoDBLessonItem));
  console.log('[DBG][lessonRepository] Found', lessons.length, 'total lessons');
  return lessons;
}

/**
 * Create a new lesson
 */
export async function createLesson(input: CreateLessonInput): Promise<LessonWithCourseId> {
  const now = new Date().toISOString();

  console.log('[DBG][lessonRepository] Creating lesson:', input.id, 'for course:', input.courseId);

  const lesson: DynamoDBLessonItem = {
    PK: EntityType.LESSON,
    SK: buildSK(input.courseId, input.id),
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
 */
export async function updateLesson(
  courseId: string,
  lessonId: string,
  updates: Partial<Lesson>
): Promise<LessonWithCourseId> {
  console.log('[DBG][lessonRepository] Updating lesson:', lessonId, 'for course:', courseId);

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
        PK: EntityType.LESSON,
        SK: buildSK(courseId, lessonId),
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
 */
export async function deleteLesson(courseId: string, lessonId: string): Promise<void> {
  console.log('[DBG][lessonRepository] Deleting lesson:', lessonId, 'from course:', courseId);

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: EntityType.LESSON,
        SK: buildSK(courseId, lessonId),
      },
    })
  );

  console.log('[DBG][lessonRepository] Deleted lesson:', lessonId);
}

/**
 * Delete all lessons for a course (batch delete)
 */
export async function deleteLessonsByCourseId(courseId: string): Promise<number> {
  console.log('[DBG][lessonRepository] Deleting all lessons for course:', courseId);

  // First, get all lessons for the course
  const lessons = await getLessonsByCourseId(courseId);

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
          PK: EntityType.LESSON,
          SK: buildSK(courseId, lesson.id),
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
 */
export async function countLessonsByCourseId(courseId: string): Promise<number> {
  const lessons = await getLessonsByCourseId(courseId);
  return lessons.length;
}

/**
 * Get free lessons for a course
 */
export async function getFreeLessonsByCourseId(courseId: string): Promise<LessonWithCourseId[]> {
  console.log('[DBG][lessonRepository] Getting free lessons for course:', courseId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'isFree = :isFree',
      ExpressionAttributeValues: {
        ':pk': EntityType.LESSON,
        ':skPrefix': `${courseId}#`,
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
 */
export async function updateLessonVideoStatus(
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

  return updateLesson(courseId, lessonId, updates);
}

/**
 * Mark lesson as completed for a user
 * Note: This updates the lesson itself - for user-specific progress, use a separate progress table
 */
export async function markLessonCompleted(
  courseId: string,
  lessonId: string,
  completed: boolean = true
): Promise<LessonWithCourseId> {
  console.log('[DBG][lessonRepository] Marking lesson:', lessonId, 'as completed:', completed);

  const updates: Partial<Lesson> = {
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  };

  return updateLesson(courseId, lessonId, updates);
}
