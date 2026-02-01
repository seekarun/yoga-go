/**
 * CourseProgress Repository - DynamoDB Operations
 *
 * Tenant-partitioned design:
 * - PK: "TENANT#{tenantId}"
 * - SK: "PROGRESS#{userId}#{courseId}"
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK } from '../dynamodb';
import type { CourseProgress, LessonProgress, SessionHistory, ProgressNote } from '@/types';

// Type for DynamoDB CourseProgress item (includes PK/SK)
interface DynamoDBCourseProgressItem extends CourseProgress {
  PK: string;
  SK: string;
}

// Type for creating a new course progress record
export interface CreateCourseProgressInput {
  userId: string;
  courseId: string;
  totalLessons: number;
}

/**
 * Convert DynamoDB item to CourseProgress type
 */
function toCourseProgress(item: DynamoDBCourseProgressItem): CourseProgress {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { PK, SK, ...progress } = item;
  return progress as CourseProgress;
}

/**
 * Get course progress by tenantId, userId and courseId
 * @param tenantId - The tenant ID
 * @param userId - The user ID (cognitoSub)
 * @param courseId - The course ID
 */
export async function getCourseProgress(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<CourseProgress | null> {
  console.log(
    '[DBG][courseProgressRepository] Getting progress for user:',
    userId,
    'course:',
    courseId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.PROGRESS(userId, courseId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][courseProgressRepository] Progress not found');
    return null;
  }

  console.log('[DBG][courseProgressRepository] Found progress');
  return toCourseProgress(result.Item as DynamoDBCourseProgressItem);
}

/**
 * Get all course progress records for a user in a tenant
 * @param tenantId - The tenant ID
 * @param userId - The user ID (cognitoSub)
 */
export async function getUserProgress(tenantId: string, userId: string): Promise<CourseProgress[]> {
  console.log(
    '[DBG][courseProgressRepository] Getting all progress for user:',
    userId,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': `PROGRESS#${userId}#`,
      },
    })
  );

  const progressRecords = (result.Items || []).map(item =>
    toCourseProgress(item as DynamoDBCourseProgressItem)
  );
  console.log('[DBG][courseProgressRepository] Found', progressRecords.length, 'progress records');
  return progressRecords;
}

/**
 * Get all course progress records for a course in a tenant
 * @param tenantId - The tenant ID
 * @param courseId - The course ID
 */
export async function getCourseProgressByCourseId(
  tenantId: string,
  courseId: string
): Promise<CourseProgress[]> {
  console.log(
    '[DBG][courseProgressRepository] Getting all progress for course:',
    courseId,
    'tenant:',
    tenantId
  );

  // Query all progress records and filter by courseId
  // Since SK is PROGRESS#{userId}#{courseId}, we need to scan and filter
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'courseId = :courseId',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'PROGRESS#',
        ':courseId': courseId,
      },
    })
  );

  const progressRecords = (result.Items || []).map(item =>
    toCourseProgress(item as DynamoDBCourseProgressItem)
  );
  console.log(
    '[DBG][courseProgressRepository] Found',
    progressRecords.length,
    'progress records for course'
  );
  return progressRecords;
}

/**
 * Get course progress records for a course enrolled after a certain date
 * @param tenantId - The tenant ID
 * @param courseId - The course ID
 * @param afterDate - ISO date string
 */
export async function getCourseProgressByCourseIdAfterDate(
  tenantId: string,
  courseId: string,
  afterDate: string
): Promise<CourseProgress[]> {
  console.log(
    '[DBG][courseProgressRepository] Getting progress for course:',
    courseId,
    'after:',
    afterDate,
    'tenant:',
    tenantId
  );

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      FilterExpression: 'courseId = :courseId AND enrolledAt >= :afterDate',
      ExpressionAttributeValues: {
        ':pk': CorePK.TENANT(tenantId),
        ':skPrefix': 'PROGRESS#',
        ':courseId': courseId,
        ':afterDate': afterDate,
      },
    })
  );

  const progressRecords = (result.Items || []).map(item =>
    toCourseProgress(item as DynamoDBCourseProgressItem)
  );
  console.log('[DBG][courseProgressRepository] Found', progressRecords.length, 'progress records');
  return progressRecords;
}

/**
 * Create a new course progress record
 * @param tenantId - The tenant ID
 * @param input - Course progress creation input
 */
export async function createCourseProgress(
  tenantId: string,
  input: CreateCourseProgressInput
): Promise<CourseProgress> {
  const now = new Date().toISOString();

  console.log(
    '[DBG][courseProgressRepository] Creating progress for user:',
    input.userId,
    'course:',
    input.courseId,
    'tenant:',
    tenantId
  );

  const progress: DynamoDBCourseProgressItem = {
    PK: CorePK.TENANT(tenantId),
    SK: CorePK.PROGRESS(input.userId, input.courseId),
    id: `${input.userId}_${input.courseId}`,
    userId: input.userId,
    courseId: input.courseId,
    enrolledAt: now,
    lastAccessed: now,
    totalLessons: input.totalLessons,
    completedLessons: [],
    percentComplete: 0,
    totalTimeSpent: 0,
    averageSessionTime: 0,
    streak: 0,
    longestStreak: 0,
    lessonProgress: [],
    sessions: [],
    notes: [],
    achievementIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: progress,
      ConditionExpression: 'attribute_not_exists(PK)', // Prevent overwriting
    })
  );

  console.log('[DBG][courseProgressRepository] Created progress record');
  return toCourseProgress(progress);
}

/**
 * Update course progress - partial update
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 * @param updates - Partial updates
 */
export async function updateCourseProgress(
  tenantId: string,
  userId: string,
  courseId: string,
  updates: Partial<CourseProgress>
): Promise<CourseProgress> {
  console.log(
    '[DBG][courseProgressRepository] Updating progress for user:',
    userId,
    'course:',
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
    if (
      value !== undefined &&
      key !== 'id' &&
      key !== 'userId' &&
      key !== 'courseId' &&
      key !== 'PK' &&
      key !== 'SK'
    ) {
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
        SK: CorePK.PROGRESS(userId, courseId),
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: exprAttrNames,
      ExpressionAttributeValues: exprAttrValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  console.log('[DBG][courseProgressRepository] Updated progress');
  return toCourseProgress(result.Attributes as DynamoDBCourseProgressItem);
}

/**
 * Update lesson progress within a course progress record
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 * @param lessonId - The lesson ID
 * @param lessonUpdate - Partial lesson progress updates
 */
export async function updateLessonProgress(
  tenantId: string,
  userId: string,
  courseId: string,
  lessonId: string,
  lessonUpdate: Partial<LessonProgress>
): Promise<CourseProgress> {
  console.log('[DBG][courseProgressRepository] Updating lesson progress:', lessonId);

  // First get the current progress
  const currentProgress = await getCourseProgress(tenantId, userId, courseId);
  if (!currentProgress) {
    throw new Error('Course progress not found');
  }

  const now = new Date().toISOString();
  const lessonProgress = [...(currentProgress.lessonProgress || [])];

  // Find or create lesson progress entry
  const existingIndex = lessonProgress.findIndex(lp => lp.lessonId === lessonId);

  if (existingIndex >= 0) {
    // Update existing
    lessonProgress[existingIndex] = {
      ...lessonProgress[existingIndex],
      ...lessonUpdate,
    };
    if (lessonUpdate.completed && !lessonProgress[existingIndex].completedAt) {
      lessonProgress[existingIndex].completedAt = now;
    }
  } else {
    // Add new
    lessonProgress.push({
      lessonId,
      completed: lessonUpdate.completed || false,
      completedAt: lessonUpdate.completed ? now : undefined,
      timeSpent: lessonUpdate.timeSpent || 0,
      notes: lessonUpdate.notes || '',
    });
  }

  // Update completedLessons array
  let completedLessons = [...(currentProgress.completedLessons || [])];
  if (lessonUpdate.completed && !completedLessons.includes(lessonId)) {
    completedLessons.push(lessonId);
  } else if (!lessonUpdate.completed && completedLessons.includes(lessonId)) {
    completedLessons = completedLessons.filter(id => id !== lessonId);
  }

  // Calculate percentage
  const percentComplete = Math.round(
    (completedLessons.length / currentProgress.totalLessons) * 100
  );

  // Update time spent
  let totalTimeSpent = currentProgress.totalTimeSpent || 0;
  if (lessonUpdate.timeSpent) {
    totalTimeSpent += lessonUpdate.timeSpent;
  }

  const updates: Partial<CourseProgress> = {
    lessonProgress,
    completedLessons,
    percentComplete,
    totalTimeSpent,
    lastAccessed: now,
    currentLessonId: lessonId,
  };

  // Mark course as completed if 100%
  if (percentComplete === 100 && !currentProgress.completedAt) {
    updates.completedAt = now;
  }

  return updateCourseProgress(tenantId, userId, courseId, updates);
}

/**
 * Add a session to course progress
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 * @param session - Session history
 */
export async function addSession(
  tenantId: string,
  userId: string,
  courseId: string,
  session: SessionHistory
): Promise<CourseProgress> {
  console.log('[DBG][courseProgressRepository] Adding session for user:', userId);

  const currentProgress = await getCourseProgress(tenantId, userId, courseId);
  if (!currentProgress) {
    throw new Error('Course progress not found');
  }

  const sessions = [...(currentProgress.sessions || []), session];
  const totalTimeSpent = (currentProgress.totalTimeSpent || 0) + session.duration;
  const averageSessionTime = Math.round(totalTimeSpent / sessions.length);

  return updateCourseProgress(tenantId, userId, courseId, {
    sessions,
    totalTimeSpent,
    averageSessionTime,
    lastAccessed: new Date().toISOString(),
  });
}

/**
 * Add a note to course progress
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 * @param note - Progress note
 */
export async function addNote(
  tenantId: string,
  userId: string,
  courseId: string,
  note: ProgressNote
): Promise<CourseProgress> {
  console.log('[DBG][courseProgressRepository] Adding note for user:', userId);

  const currentProgress = await getCourseProgress(tenantId, userId, courseId);
  if (!currentProgress) {
    throw new Error('Course progress not found');
  }

  const notes = [...(currentProgress.notes || []), note];

  return updateCourseProgress(tenantId, userId, courseId, { notes });
}

/**
 * Update streak for course progress
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 */
export async function updateStreak(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<CourseProgress> {
  console.log('[DBG][courseProgressRepository] Updating streak for user:', userId);

  const currentProgress = await getCourseProgress(tenantId, userId, courseId);
  if (!currentProgress) {
    throw new Error('Course progress not found');
  }

  const today = new Date().toISOString().split('T')[0];
  const lastPractice = currentProgress.lastPracticeDate?.split('T')[0];

  let streak = currentProgress.streak || 0;
  let longestStreak = currentProgress.longestStreak || 0;

  if (lastPractice) {
    const lastDate = new Date(lastPractice);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Consecutive day
      streak += 1;
    } else if (diffDays > 1) {
      // Streak broken
      streak = 1;
    }
    // If diffDays === 0, same day, don't change streak
  } else {
    streak = 1;
  }

  if (streak > longestStreak) {
    longestStreak = streak;
  }

  return updateCourseProgress(tenantId, userId, courseId, {
    streak,
    longestStreak,
    lastPracticeDate: today,
  });
}

/**
 * Delete course progress
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 */
export async function deleteCourseProgress(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<void> {
  console.log(
    '[DBG][courseProgressRepository] Deleting progress for user:',
    userId,
    'course:',
    courseId,
    'tenant:',
    tenantId
  );

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.TENANT(tenantId),
        SK: CorePK.PROGRESS(userId, courseId),
      },
    })
  );

  console.log('[DBG][courseProgressRepository] Deleted progress');
}

/**
 * Check if user has progress for a course (is enrolled)
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 * @param courseId - The course ID
 */
export async function hasProgress(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<boolean> {
  const progress = await getCourseProgress(tenantId, userId, courseId);
  return progress !== null;
}

/**
 * Get completed course count for a user
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 */
export async function getCompletedCourseCount(tenantId: string, userId: string): Promise<number> {
  const allProgress = await getUserProgress(tenantId, userId);
  return allProgress.filter(p => p.percentComplete === 100).length;
}

/**
 * Delete all course progress for a user in a tenant
 * Returns the count of deleted records
 * @param tenantId - The tenant ID
 * @param userId - The user ID
 */
export async function deleteAllByUser(tenantId: string, userId: string): Promise<number> {
  console.log(
    '[DBG][courseProgressRepository] Deleting all progress for user:',
    userId,
    'tenant:',
    tenantId
  );

  const progressRecords = await getUserProgress(tenantId, userId);

  if (progressRecords.length === 0) {
    console.log('[DBG][courseProgressRepository] No progress records to delete');
    return 0;
  }

  // Delete each progress record
  for (const progress of progressRecords) {
    await deleteCourseProgress(tenantId, userId, progress.courseId);
  }

  console.log(
    '[DBG][courseProgressRepository] Deleted',
    progressRecords.length,
    'progress records'
  );
  return progressRecords.length;
}

/**
 * Delete all progress records for a course (for course deletion)
 * @param tenantId - The tenant ID
 * @param courseId - The course ID
 */
export async function deleteAllByCourse(tenantId: string, courseId: string): Promise<number> {
  console.log(
    '[DBG][courseProgressRepository] Deleting all progress for course:',
    courseId,
    'tenant:',
    tenantId
  );

  const progressRecords = await getCourseProgressByCourseId(tenantId, courseId);

  if (progressRecords.length === 0) {
    console.log('[DBG][courseProgressRepository] No progress records to delete');
    return 0;
  }

  for (const progress of progressRecords) {
    await deleteCourseProgress(tenantId, progress.userId, courseId);
  }

  console.log(
    '[DBG][courseProgressRepository] Deleted',
    progressRecords.length,
    'progress records'
  );
  return progressRecords.length;
}

// ===================================================================
// BACKWARD COMPATIBILITY ALIASES
// ===================================================================

/** @deprecated Use getUserProgress(tenantId, userId) instead */
export async function getCourseProgressByUserId(userId: string): Promise<CourseProgress[]> {
  console.warn(
    '[DBG][courseProgressRepository] getCourseProgressByUserId() is deprecated - use getUserProgress(tenantId, userId)'
  );
  return [];
}
