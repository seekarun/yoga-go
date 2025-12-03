/**
 * Discussion repository for DynamoDB operations
 * Handles CRUD operations for course discussions
 *
 * 5-Table Design - DISCUSSIONS table with dual-write pattern:
 * - Primary: PK=COURSE#{courseId}, SK=LESSON#{lessonId}#DISC#{discussionId}
 * - Direct lookup: PK=DISC#{discussionId}, SK=META
 * - GSI1 for replies: GSI1PK=PARENT#{parentId} or TOPLEVEL#{courseId}#{lessonId}
 */

import { docClient, Tables, DiscussionsPK, EntityType } from '../dynamodb';
import { GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Discussion } from '@/types';

// Helper to generate discussion SK for course lookup
const generateCourseSK = (lessonId: string, discussionId: string) =>
  `LESSON#${lessonId}#DISC#${discussionId}`;

// Helper to generate a unique discussion ID
const generateDiscussionId = () => `disc_${Date.now()}_${Math.random().toString(36).substring(7)}`;

/**
 * Create a new discussion
 * Uses dual-write pattern for efficient lookups
 */
export async function createDiscussion(
  input: Omit<Discussion, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Discussion> {
  console.log('[DBG][discussionRepository] Creating discussion for course:', input.courseId);

  const now = new Date().toISOString();
  const discussionId = generateDiscussionId();

  const discussion: Discussion = {
    ...input,
    id: discussionId,
    upvotes: input.upvotes ?? 0,
    downvotes: input.downvotes ?? 0,
    isPinned: input.isPinned ?? false,
    isResolved: input.isResolved ?? false,
    isHidden: input.isHidden ?? false,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. Course/Lesson lookup: PK=COURSE#{courseId}, SK=LESSON#{lessonId}#DISC#{discussionId}
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.COURSE(input.courseId),
          SK: generateCourseSK(input.lessonId, discussionId),
          entityType: EntityType.DISCUSSION,
          // GSI1 for querying by parentId (for replies) or top-level discussions
          GSI1PK: input.parentId
            ? `PARENT#${input.parentId}`
            : `TOPLEVEL#${input.courseId}#${input.lessonId}`,
          GSI1SK: now,
          ...discussion,
        },
      },
    },
    // 2. Direct discussion lookup: PK=DISC#{discussionId}, SK=META
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.DISCUSSION(discussionId),
          SK: 'META',
          entityType: EntityType.DISCUSSION,
          ...discussion,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: writeRequests,
      },
    })
  );

  console.log('[DBG][discussionRepository] Discussion created:', discussionId);
  return discussion;
}

/**
 * Get a discussion by ID (requires courseId and lessonId for direct lookup)
 */
export async function getDiscussionById(
  courseId: string,
  lessonId: string,
  discussionId: string
): Promise<Discussion | null> {
  console.log('[DBG][discussionRepository] Getting discussion:', discussionId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.DISCUSSIONS,
      Key: {
        PK: DiscussionsPK.COURSE(courseId),
        SK: generateCourseSK(lessonId, discussionId),
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][discussionRepository] Discussion not found:', discussionId);
    return null;
  }

  return mapToDiscussion(result.Item);
}

/**
 * Get a discussion by just the discussionId
 * Uses dual-write direct lookup - O(1) operation
 */
export async function getDiscussionByIdOnly(discussionId: string): Promise<Discussion | null> {
  console.log('[DBG][discussionRepository] Getting discussion by ID only:', discussionId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.DISCUSSIONS,
      Key: {
        PK: DiscussionsPK.DISCUSSION(discussionId),
        SK: 'META',
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][discussionRepository] Discussion not found:', discussionId);
    return null;
  }

  console.log('[DBG][discussionRepository] Found discussion:', discussionId);
  return mapToDiscussion(result.Item);
}

/**
 * Get discussions for a specific lesson (top-level only)
 * Uses GSI1 for efficient lookup
 */
export async function getDiscussionsByLesson(
  courseId: string,
  lessonId: string
): Promise<Discussion[]> {
  console.log('[DBG][discussionRepository] Getting discussions for lesson:', lessonId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `TOPLEVEL#${courseId}#${lessonId}`,
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  const discussions = (result.Items || []).map(mapToDiscussion);
  console.log('[DBG][discussionRepository] Found', discussions.length, 'discussions');
  return discussions;
}

/**
 * Get all discussions for a course (top-level, across all lessons)
 */
export async function getDiscussionsByCourse(courseId: string): Promise<Discussion[]> {
  console.log('[DBG][discussionRepository] Getting all discussions for course:', courseId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': DiscussionsPK.COURSE(courseId),
      },
      ScanIndexForward: false,
    })
  );

  const discussions = (result.Items || []).map(mapToDiscussion);
  console.log('[DBG][discussionRepository] Found', discussions.length, 'discussions for course');
  return discussions;
}

/**
 * Get replies to a discussion
 * Uses GSI1 for efficient lookup
 */
export async function getReplies(parentId: string): Promise<Discussion[]> {
  console.log('[DBG][discussionRepository] Getting replies for discussion:', parentId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: {
        ':gsi1pk': `PARENT#${parentId}`,
      },
      ScanIndexForward: true, // Oldest first for replies
    })
  );

  const replies = (result.Items || []).map(mapToDiscussion);
  console.log('[DBG][discussionRepository] Found', replies.length, 'replies');
  return replies;
}

/**
 * Get discussions by user
 * Note: This access pattern is not optimized. Consider if needed.
 */
export async function getDiscussionsByUser(userId: string): Promise<Discussion[]> {
  console.log('[DBG][discussionRepository] Getting discussions for user:', userId);
  console.warn('[DBG][discussionRepository] getDiscussionsByUser is not efficient without GSI');
  return [];
}

/**
 * Update a discussion
 * Updates both dual-write copies
 */
export async function updateDiscussion(
  courseId: string,
  lessonId: string,
  discussionId: string,
  updates: Partial<
    Pick<Discussion, 'content' | 'isPinned' | 'isResolved' | 'isHidden' | 'editedAt'>
  >
): Promise<Discussion | null> {
  console.log('[DBG][discussionRepository] Updating discussion:', discussionId);

  // First get the current discussion to rebuild the full object
  const current = await getDiscussionById(courseId, lessonId, discussionId);
  if (!current) {
    console.log('[DBG][discussionRepository] Discussion not found for update:', discussionId);
    return null;
  }

  const now = new Date().toISOString();
  const updatedDiscussion: Discussion = {
    ...current,
    ...updates,
    editedAt: updates.content !== undefined ? now : current.editedAt,
    updatedAt: now,
  };

  // Dual-write: Update both copies
  const writeRequests = [
    // 1. Course/Lesson lookup
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.COURSE(courseId),
          SK: generateCourseSK(lessonId, discussionId),
          entityType: EntityType.DISCUSSION,
          GSI1PK: current.parentId
            ? `PARENT#${current.parentId}`
            : `TOPLEVEL#${courseId}#${lessonId}`,
          GSI1SK: current.createdAt,
          ...updatedDiscussion,
        },
      },
    },
    // 2. Direct lookup
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.DISCUSSION(discussionId),
          SK: 'META',
          entityType: EntityType.DISCUSSION,
          ...updatedDiscussion,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: writeRequests,
      },
    })
  );

  console.log('[DBG][discussionRepository] Discussion updated:', discussionId);
  return updatedDiscussion;
}

/**
 * Update vote counts on a discussion
 * Updates both dual-write copies
 */
export async function updateVoteCounts(
  courseId: string,
  lessonId: string,
  discussionId: string,
  upvoteDelta: number,
  downvoteDelta: number
): Promise<Discussion | null> {
  console.log('[DBG][discussionRepository] Updating vote counts:', discussionId);

  // Get current discussion
  const current = await getDiscussionById(courseId, lessonId, discussionId);
  if (!current) {
    return null;
  }

  const now = new Date().toISOString();
  const updatedDiscussion: Discussion = {
    ...current,
    upvotes: Math.max(0, current.upvotes + upvoteDelta),
    downvotes: Math.max(0, current.downvotes + downvoteDelta),
    updatedAt: now,
  };

  // Dual-write: Update both copies
  const writeRequests = [
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.COURSE(courseId),
          SK: generateCourseSK(lessonId, discussionId),
          entityType: EntityType.DISCUSSION,
          GSI1PK: current.parentId
            ? `PARENT#${current.parentId}`
            : `TOPLEVEL#${courseId}#${lessonId}`,
          GSI1SK: current.createdAt,
          ...updatedDiscussion,
        },
      },
    },
    {
      PutRequest: {
        Item: {
          PK: DiscussionsPK.DISCUSSION(discussionId),
          SK: 'META',
          entityType: EntityType.DISCUSSION,
          ...updatedDiscussion,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: writeRequests,
      },
    })
  );

  return updatedDiscussion;
}

/**
 * Soft delete a discussion
 * Updates both dual-write copies
 */
export async function softDeleteDiscussion(
  courseId: string,
  lessonId: string,
  discussionId: string
): Promise<Discussion | null> {
  console.log('[DBG][discussionRepository] Soft deleting discussion:', discussionId);

  return updateDiscussion(courseId, lessonId, discussionId, {
    isHidden: true,
  });
}

/**
 * Hard delete a discussion
 * Deletes both dual-write copies
 */
export async function deleteDiscussion(
  courseId: string,
  lessonId: string,
  discussionId: string
): Promise<boolean> {
  console.log('[DBG][discussionRepository] Hard deleting discussion:', discussionId);

  const deleteRequests = [
    // 1. Course/Lesson lookup
    {
      DeleteRequest: {
        Key: {
          PK: DiscussionsPK.COURSE(courseId),
          SK: generateCourseSK(lessonId, discussionId),
        },
      },
    },
    // 2. Direct lookup
    {
      DeleteRequest: {
        Key: {
          PK: DiscussionsPK.DISCUSSION(discussionId),
          SK: 'META',
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.DISCUSSIONS]: deleteRequests,
      },
    })
  );

  console.log('[DBG][discussionRepository] Discussion deleted:', discussionId);
  return true;
}

/**
 * Map DynamoDB item to Discussion type
 */
function mapToDiscussion(item: Record<string, unknown>): Discussion {
  return {
    id: item.id as string,
    courseId: item.courseId as string,
    lessonId: item.lessonId as string,
    userId: item.userId as string,
    userRole: item.userRole as 'learner' | 'expert',
    userName: item.userName as string,
    userAvatar: item.userAvatar as string | undefined,
    content: item.content as string,
    parentId: item.parentId as string | undefined,
    upvotes: (item.upvotes as number) || 0,
    downvotes: (item.downvotes as number) || 0,
    isPinned: (item.isPinned as boolean) || false,
    isResolved: (item.isResolved as boolean) || false,
    isHidden: (item.isHidden as boolean) || false,
    editedAt: item.editedAt as string | undefined,
    deletedAt: item.deletedAt as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
