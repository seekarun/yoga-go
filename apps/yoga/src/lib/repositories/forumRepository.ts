/**
 * Forum Repository - Slack-like Discussion System
 *
 * Uses DISCUSSIONS table with tenant-isolated structure:
 * - PK: TENANT#{expertId}
 * - SK: CTX#{context}#THREAD#{createdAt}#{threadId} (top-level message)
 * - SK: CTX#{context}#THREAD#{threadId}#REPLY#{createdAt}#{replyId} (reply)
 * - SK: CTX#{context}#LIKE#{msgId}#{visitorId} (like tracking)
 *
 * GSI1 for tenant-wide date sorting:
 * - GSI1PK: TENANT#{expertId}
 * - GSI1SK: {createdAt}#{msgId}
 */

import { docClient, Tables, ForumPK, EntityType } from '../dynamodb';
import {
  QueryCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
  GetCommand,
} from '@aws-sdk/lib-dynamodb';
import type {
  ForumThread,
  ForumReply,
  ForumReplyWithLike,
  ForumThreadWithReplies,
  ForumThreadForDashboard,
  ForumContextType,
  ForumContextVisibility,
} from '@/types';

// Helper to generate unique IDs
const generateId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

// ============================================
// Thread Operations
// ============================================

interface CreateThreadInput {
  expertId: string;
  context: string;
  contextType: ForumContextType;
  contextVisibility: ForumContextVisibility;
  userId: string;
  userRole: 'learner' | 'expert';
  userName: string;
  userAvatar?: string;
  content: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

/**
 * Create a new thread (top-level message)
 */
export async function createThread(input: CreateThreadInput): Promise<ForumThread> {
  console.log('[DBG][forumRepository] Creating thread for context:', input.context);

  const now = new Date().toISOString();
  const threadId = generateId('thread');

  const thread: ForumThread = {
    id: threadId,
    expertId: input.expertId,
    context: input.context,
    contextType: input.contextType,
    contextVisibility: input.contextVisibility,
    userId: input.userId,
    userRole: input.userRole,
    userName: input.userName,
    userAvatar: input.userAvatar,
    content: input.content,
    likeCount: 0,
    replyCount: 0,
    sourceTitle: input.sourceTitle,
    sourceUrl: input.sourceUrl,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.DISCUSSIONS,
      Item: {
        PK: ForumPK.TENANT(input.expertId),
        SK: ForumPK.THREAD_SK(input.context, now, threadId),
        GSI1PK: ForumPK.TENANT(input.expertId),
        GSI1SK: ForumPK.GSI1_SK(now, threadId),
        entityType: EntityType.FORUM_THREAD,
        ...thread,
      },
    })
  );

  console.log('[DBG][forumRepository] Thread created:', threadId);
  return thread;
}

// ============================================
// Reply Operations
// ============================================

interface CreateReplyInput {
  expertId: string;
  context: string;
  contextType: ForumContextType;
  contextVisibility: ForumContextVisibility;
  threadId: string;
  userId: string;
  userRole: 'learner' | 'expert';
  userName: string;
  userAvatar?: string;
  content: string;
}

/**
 * Create a reply to a thread (flat, no nesting)
 */
export async function createReply(input: CreateReplyInput): Promise<ForumReply> {
  console.log('[DBG][forumRepository] Creating reply for thread:', input.threadId);

  const now = new Date().toISOString();
  const replyId = generateId('reply');

  const reply: ForumReply = {
    id: replyId,
    threadId: input.threadId,
    expertId: input.expertId,
    context: input.context,
    contextType: input.contextType,
    contextVisibility: input.contextVisibility,
    userId: input.userId,
    userRole: input.userRole,
    userName: input.userName,
    userAvatar: input.userAvatar,
    content: input.content,
    likeCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Write reply and increment thread reply count in parallel
  await Promise.all([
    // Write reply
    docClient.send(
      new PutCommand({
        TableName: Tables.DISCUSSIONS,
        Item: {
          PK: ForumPK.TENANT(input.expertId),
          SK: ForumPK.REPLY_SK(input.context, input.threadId, now, replyId),
          GSI1PK: ForumPK.TENANT(input.expertId),
          GSI1SK: ForumPK.GSI1_SK(now, replyId),
          entityType: EntityType.FORUM_REPLY,
          ...reply,
        },
      })
    ),
    // Increment reply count on thread
    incrementReplyCount(input.expertId, input.context, input.threadId),
  ]);

  console.log('[DBG][forumRepository] Reply created:', replyId);
  return reply;
}

/**
 * Increment reply count on a thread
 */
async function incrementReplyCount(
  expertId: string,
  context: string,
  threadId: string
): Promise<void> {
  // First, find the thread's SK (we need the full SK to update)
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'id = :threadId',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':prefix': ForumPK.THREAD_PREFIX(context),
        ':threadId': threadId,
      },
      Limit: 1,
    })
  );

  if (result.Items && result.Items.length > 0) {
    const item = result.Items[0];
    await docClient.send(
      new UpdateCommand({
        TableName: Tables.DISCUSSIONS,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression:
          'SET replyCount = if_not_exists(replyCount, :zero) + :one, updatedAt = :now',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
      })
    );
  }
}

// ============================================
// Query Operations
// ============================================

/**
 * Get all threads for a context (e.g., blog post comments)
 */
export async function getThreadsByContext(
  expertId: string,
  context: string
): Promise<ForumThreadWithReplies[]> {
  console.log('[DBG][forumRepository] Getting threads with replies for context:', context);

  // Query all items (threads and replies) for this context
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'entityType = :threadType OR entityType = :replyType',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':prefix': ForumPK.CTX_PREFIX(context),
        ':threadType': EntityType.FORUM_THREAD,
        ':replyType': EntityType.FORUM_REPLY,
      },
      ScanIndexForward: true, // Chronological order
    })
  );

  // Group items into threads with replies
  const threadMap = new Map<string, ForumThreadWithReplies>();
  const repliesByThread = new Map<string, ForumReplyWithLike[]>();

  for (const item of result.Items || []) {
    if (item.entityType === EntityType.FORUM_THREAD) {
      threadMap.set(item.id as string, {
        ...mapToThread(item),
        replies: [],
        userLiked: false,
      });
    } else if (item.entityType === EntityType.FORUM_REPLY) {
      const threadId = item.threadId as string;
      if (!repliesByThread.has(threadId)) {
        repliesByThread.set(threadId, []);
      }
      repliesByThread.get(threadId)!.push({ ...mapToReply(item), userLiked: false });
    }
  }

  // Attach replies to threads
  for (const [threadId, replies] of repliesByThread) {
    const thread = threadMap.get(threadId);
    if (thread) {
      thread.replies = replies;
    }
  }

  const threads = Array.from(threadMap.values());
  console.log('[DBG][forumRepository] Found', threads.length, 'threads with replies');
  return threads;
}

/**
 * Get a thread with all its replies
 */
export async function getThreadWithReplies(
  expertId: string,
  context: string,
  threadId: string
): Promise<ForumThreadWithReplies | null> {
  console.log('[DBG][forumRepository] Getting thread with replies:', threadId);

  // Query for thread and all its replies using the thread prefix
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':prefix': ForumPK.THREAD_WITH_REPLIES_PREFIX(context, threadId),
      },
      ScanIndexForward: true, // Chronological order
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  // Separate thread from replies
  let thread: ForumThread | null = null;
  const replies: ForumReplyWithLike[] = [];

  for (const item of result.Items) {
    if (item.entityType === EntityType.FORUM_THREAD) {
      thread = mapToThread(item);
    } else if (item.entityType === EntityType.FORUM_REPLY) {
      replies.push({ ...mapToReply(item), userLiked: false });
    }
  }

  if (!thread) {
    return null;
  }

  return {
    ...thread,
    replies,
    userLiked: false, // Will be enriched by caller
  };
}

/**
 * Get all threads with replies for a tenant (expert dashboard)
 * Includes unread status calculation
 */
export async function getAllThreadsForExpert(
  expertId: string,
  options?: { limit?: number; lastKey?: string }
): Promise<{ threads: ForumThreadForDashboard[]; lastKey?: string }> {
  console.log('[DBG][forumRepository] Getting all threads with replies for expert:', expertId);

  // Query all items (threads and replies) for this tenant
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'entityType = :threadType OR entityType = :replyType',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':threadType': EntityType.FORUM_THREAD,
        ':replyType': EntityType.FORUM_REPLY,
      },
      ScanIndexForward: true, // Chronological order
    })
  );

  // Group items into threads with replies
  const threadMap = new Map<string, ForumThreadForDashboard>();
  const repliesByThread = new Map<string, ForumReplyWithLike[]>();

  for (const item of result.Items || []) {
    if (item.entityType === EntityType.FORUM_THREAD) {
      const thread = mapToThread(item);
      threadMap.set(item.id as string, {
        ...thread,
        replies: [],
        userLiked: false,
        isNew: false,
        hasNewReplies: false,
        newReplyCount: 0,
      });
    } else if (item.entityType === EntityType.FORUM_REPLY) {
      const threadId = item.threadId as string;
      if (!repliesByThread.has(threadId)) {
        repliesByThread.set(threadId, []);
      }
      repliesByThread.get(threadId)!.push({ ...mapToReply(item), userLiked: false });
    }
  }

  // Attach replies to threads and calculate unread status
  for (const [threadId, replies] of repliesByThread) {
    const thread = threadMap.get(threadId);
    if (thread) {
      thread.replies = replies;
    }
  }

  // Calculate isNew and hasNewReplies for each thread
  const threads: ForumThreadForDashboard[] = [];
  for (const thread of threadMap.values()) {
    const lastReadAt = thread.expertLastReadAt;

    // Thread is new if never read
    thread.isNew = !lastReadAt;

    // Count new replies (created after last read)
    if (lastReadAt) {
      const newReplies = thread.replies.filter(r => r.createdAt && r.createdAt > lastReadAt);
      thread.newReplyCount = newReplies.length;
      thread.hasNewReplies = newReplies.length > 0;
    } else {
      // If never read, all replies are "new"
      thread.newReplyCount = thread.replies.length;
      thread.hasNewReplies = thread.replies.length > 0;
    }

    threads.push(thread);
  }

  // Sort by most recent activity (newest thread or newest reply first)
  threads.sort((a, b) => {
    const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const aReplyTimes = a.replies.map(r => (r.createdAt ? new Date(r.createdAt).getTime() : 0));
    const aLatest = a.replies.length > 0 ? Math.max(aCreated, ...aReplyTimes) : aCreated;

    const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    const bReplyTimes = b.replies.map(r => (r.createdAt ? new Date(r.createdAt).getTime() : 0));
    const bLatest = b.replies.length > 0 ? Math.max(bCreated, ...bReplyTimes) : bCreated;

    return bLatest - aLatest; // Most recent first
  });

  // Apply pagination limit
  const limit = options?.limit || 50;
  const paginatedThreads = threads.slice(0, limit);

  console.log('[DBG][forumRepository] Found', threads.length, 'threads for expert');

  return {
    threads: paginatedThreads,
    lastKey: threads.length > limit ? 'more' : undefined,
  };
}

/**
 * Get thread count for a context
 */
export async function getThreadCount(expertId: string, context: string): Promise<number> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'entityType = :threadType',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':prefix': ForumPK.THREAD_PREFIX(context),
        ':threadType': EntityType.FORUM_THREAD,
      },
      Select: 'COUNT',
    })
  );

  return result.Count || 0;
}

// ============================================
// Update Operations
// ============================================

/**
 * Update message content (thread or reply)
 */
export async function updateMessage(
  expertId: string,
  context: string,
  messageId: string,
  content: string
): Promise<boolean> {
  console.log('[DBG][forumRepository] Updating message:', messageId);

  // Find the message first
  const message = await findMessageByIdInContext(expertId, context, messageId);
  if (!message) {
    return false;
  }

  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.DISCUSSIONS,
      Key: { PK: message.PK, SK: message.SK },
      UpdateExpression: 'SET content = :content, updatedAt = :now, editedAt = :now',
      ExpressionAttributeValues: {
        ':content': content,
        ':now': now,
      },
    })
  );

  return true;
}

/**
 * Delete a message (thread or reply)
 * If deleting a thread, also delete all its replies and likes
 */
export async function deleteMessage(
  expertId: string,
  context: string,
  messageId: string
): Promise<boolean> {
  console.log('[DBG][forumRepository] Deleting message:', messageId);

  // Find the message
  const message = await findMessageByIdInContext(expertId, context, messageId);
  if (!message) {
    return false;
  }

  const isThread = message.entityType === EntityType.FORUM_THREAD;

  if (isThread) {
    // Delete thread and all its replies
    const allItems = await docClient.send(
      new QueryCommand({
        TableName: Tables.DISCUSSIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': ForumPK.TENANT(expertId),
          ':prefix': ForumPK.THREAD_WITH_REPLIES_PREFIX(context, messageId),
        },
      })
    );

    // Also get likes for this thread and its replies
    const likesToDelete: { PK: string; SK: string }[] = [];
    for (const item of allItems.Items || []) {
      const likes = await docClient.send(
        new QueryCommand({
          TableName: Tables.DISCUSSIONS,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
          ExpressionAttributeValues: {
            ':pk': ForumPK.TENANT(expertId),
            ':prefix': ForumPK.LIKE_PREFIX(context, item.id),
          },
        })
      );
      for (const like of likes.Items || []) {
        likesToDelete.push({ PK: like.PK as string, SK: like.SK as string });
      }
    }

    // Delete all items
    const itemsToDelete = [
      ...(allItems.Items || []).map(i => ({ PK: i.PK as string, SK: i.SK as string })),
      ...likesToDelete,
    ];

    for (const item of itemsToDelete) {
      await docClient.send(
        new DeleteCommand({
          TableName: Tables.DISCUSSIONS,
          Key: { PK: item.PK, SK: item.SK },
        })
      );
    }
  } else {
    // Just delete the reply and its likes
    await docClient.send(
      new DeleteCommand({
        TableName: Tables.DISCUSSIONS,
        Key: { PK: message.PK, SK: message.SK },
      })
    );

    // Delete likes for this reply
    const likes = await docClient.send(
      new QueryCommand({
        TableName: Tables.DISCUSSIONS,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
        ExpressionAttributeValues: {
          ':pk': ForumPK.TENANT(expertId),
          ':prefix': ForumPK.LIKE_PREFIX(context, messageId),
        },
      })
    );

    for (const like of likes.Items || []) {
      await docClient.send(
        new DeleteCommand({
          TableName: Tables.DISCUSSIONS,
          Key: { PK: like.PK, SK: like.SK },
        })
      );
    }

    // Decrement reply count on parent thread
    const threadId = message.threadId;
    if (threadId) {
      await decrementReplyCount(expertId, context, threadId);
    }
  }

  return true;
}

async function decrementReplyCount(
  expertId: string,
  context: string,
  threadId: string
): Promise<void> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'id = :threadId',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':prefix': ForumPK.THREAD_PREFIX(context),
        ':threadId': threadId,
      },
      Limit: 1,
    })
  );

  if (result.Items && result.Items.length > 0) {
    const item = result.Items[0];
    await docClient.send(
      new UpdateCommand({
        TableName: Tables.DISCUSSIONS,
        Key: { PK: item.PK, SK: item.SK },
        UpdateExpression: 'SET replyCount = replyCount - :one, updatedAt = :now',
        ConditionExpression: 'replyCount > :zero',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
      })
    );
  }
}

// ============================================
// Like Operations
// ============================================

/**
 * Like a message
 */
export async function likeMessage(
  expertId: string,
  context: string,
  messageId: string,
  visitorId: string
): Promise<boolean> {
  console.log('[DBG][forumRepository] Liking message:', messageId, 'by:', visitorId);

  // Check if already liked
  const existingLike = await docClient.send(
    new GetCommand({
      TableName: Tables.DISCUSSIONS,
      Key: {
        PK: ForumPK.TENANT(expertId),
        SK: ForumPK.LIKE_SK(context, messageId, visitorId),
      },
    })
  );

  if (existingLike.Item) {
    console.log('[DBG][forumRepository] Already liked');
    return false;
  }

  // Create like and increment count
  await docClient.send(
    new PutCommand({
      TableName: Tables.DISCUSSIONS,
      Item: {
        PK: ForumPK.TENANT(expertId),
        SK: ForumPK.LIKE_SK(context, messageId, visitorId),
        entityType: EntityType.FORUM_LIKE,
        messageId,
        visitorId,
        likedAt: new Date().toISOString(),
      },
    })
  );

  // Increment like count on message
  await updateLikeCount(expertId, context, messageId, 1);

  return true;
}

/**
 * Unlike a message
 */
export async function unlikeMessage(
  expertId: string,
  context: string,
  messageId: string,
  visitorId: string
): Promise<boolean> {
  console.log('[DBG][forumRepository] Unliking message:', messageId, 'by:', visitorId);

  const likeKey = {
    PK: ForumPK.TENANT(expertId),
    SK: ForumPK.LIKE_SK(context, messageId, visitorId),
  };

  // Check if like exists
  const existingLike = await docClient.send(
    new GetCommand({
      TableName: Tables.DISCUSSIONS,
      Key: likeKey,
    })
  );

  if (!existingLike.Item) {
    console.log('[DBG][forumRepository] Like not found');
    return false;
  }

  // Delete like and decrement count
  await docClient.send(
    new DeleteCommand({
      TableName: Tables.DISCUSSIONS,
      Key: likeKey,
    })
  );

  // Decrement like count on message
  await updateLikeCount(expertId, context, messageId, -1);

  return true;
}

/**
 * Check if a user has liked a message
 */
export async function hasUserLiked(
  expertId: string,
  context: string,
  messageId: string,
  visitorId: string
): Promise<boolean> {
  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.DISCUSSIONS,
      Key: {
        PK: ForumPK.TENANT(expertId),
        SK: ForumPK.LIKE_SK(context, messageId, visitorId),
      },
    })
  );

  return !!result.Item;
}

/**
 * Get like status for multiple messages
 */
export async function getUserLikesForMessages(
  expertId: string,
  context: string,
  messageIds: string[],
  visitorId: string
): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {};

  // Check each message (could be optimized with BatchGetItem for larger sets)
  await Promise.all(
    messageIds.map(async messageId => {
      result[messageId] = await hasUserLiked(expertId, context, messageId, visitorId);
    })
  );

  return result;
}

async function updateLikeCount(
  expertId: string,
  context: string,
  messageId: string,
  delta: number
): Promise<void> {
  const message = await findMessageByIdInContext(expertId, context, messageId);
  if (!message) return;

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.DISCUSSIONS,
      Key: { PK: message.PK, SK: message.SK },
      UpdateExpression: 'SET likeCount = if_not_exists(likeCount, :zero) + :delta',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':delta': delta,
      },
    })
  );
}

// ============================================
// Helper Functions
// ============================================

/**
 * Find a thread by ID without knowing the context.
 * Searches all items in the tenant partition.
 */
export async function findThreadById(
  expertId: string,
  threadId: string
): Promise<ForumThread | null> {
  console.log('[DBG][forumRepository] Finding thread by ID:', threadId);

  // Query all items for this tenant and filter by thread ID
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :threadId AND entityType = :entityType',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':threadId': threadId,
        ':entityType': EntityType.FORUM_THREAD,
      },
    })
  );

  if (result.Items && result.Items.length > 0) {
    return mapToThread(result.Items[0]);
  }

  return null;
}

/**
 * Find any message (thread or reply) by ID without knowing the context.
 * Returns minimal info needed for operations like liking.
 */
export async function findMessageById(
  expertId: string,
  messageId: string
): Promise<{ context: string; entityType: string; threadId?: string } | null> {
  console.log('[DBG][forumRepository] Finding message by ID:', messageId);

  // Query all items for this tenant and filter by message ID
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :messageId AND (entityType = :threadType OR entityType = :replyType)',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':messageId': messageId,
        ':threadType': EntityType.FORUM_THREAD,
        ':replyType': EntityType.FORUM_REPLY,
      },
    })
  );

  if (result.Items && result.Items.length > 0) {
    const item = result.Items[0];
    return {
      context: item.context as string,
      entityType: item.entityType as string,
      threadId: item.threadId as string | undefined,
    };
  }

  return null;
}

async function findMessageByIdInContext(
  expertId: string,
  context: string,
  messageId: string
): Promise<{ PK: string; SK: string; entityType: string; threadId?: string } | null> {
  // Search for the message in the context
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :prefix)',
      FilterExpression: 'id = :messageId',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':prefix': ForumPK.CTX_PREFIX(context),
        ':messageId': messageId,
      },
    })
  );

  if (result.Items && result.Items.length > 0) {
    const item = result.Items[0];
    return {
      PK: item.PK as string,
      SK: item.SK as string,
      entityType: item.entityType as string,
      threadId: item.threadId as string | undefined,
    };
  }

  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToThread(item: Record<string, any>): ForumThread {
  return {
    id: item.id,
    expertId: item.expertId,
    context: item.context,
    contextType: item.contextType,
    contextVisibility: item.contextVisibility,
    userId: item.userId,
    userRole: item.userRole,
    userName: item.userName,
    userAvatar: item.userAvatar,
    content: item.content,
    likeCount: item.likeCount || 0,
    replyCount: item.replyCount || 0,
    sourceTitle: item.sourceTitle,
    sourceUrl: item.sourceUrl,
    editedAt: item.editedAt,
    expertLastReadAt: item.expertLastReadAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapToReply(item: Record<string, any>): ForumReply {
  return {
    id: item.id,
    threadId: item.threadId,
    expertId: item.expertId,
    context: item.context,
    contextType: item.contextType,
    contextVisibility: item.contextVisibility,
    userId: item.userId,
    userRole: item.userRole,
    userName: item.userName,
    userAvatar: item.userAvatar,
    content: item.content,
    likeCount: item.likeCount || 0,
    editedAt: item.editedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

// ============================================
// Read Tracking
// ============================================

/**
 * Mark a thread as read by the expert
 * Updates expertLastReadAt to current time
 */
export async function markThreadAsRead(expertId: string, threadId: string): Promise<boolean> {
  console.log('[DBG][forumRepository] Marking thread as read:', threadId);

  // Find the thread first
  const thread = await findThreadById(expertId, threadId);
  if (!thread) {
    return false;
  }

  // Find the actual item to get PK/SK
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.DISCUSSIONS,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :threadId AND entityType = :entityType',
      ExpressionAttributeValues: {
        ':pk': ForumPK.TENANT(expertId),
        ':threadId': threadId,
        ':entityType': EntityType.FORUM_THREAD,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return false;
  }

  const item = result.Items[0];
  const now = new Date().toISOString();

  await docClient.send(
    new UpdateCommand({
      TableName: Tables.DISCUSSIONS,
      Key: { PK: item.PK, SK: item.SK },
      UpdateExpression: 'SET expertLastReadAt = :now, updatedAt = :now',
      ExpressionAttributeValues: {
        ':now': now,
      },
    })
  );

  return true;
}

/**
 * Mark multiple threads as read
 */
export async function markThreadsAsRead(expertId: string, threadIds: string[]): Promise<number> {
  let count = 0;
  for (const threadId of threadIds) {
    const success = await markThreadAsRead(expertId, threadId);
    if (success) count++;
  }
  return count;
}

// ============================================
// Tenant Cleanup
// ============================================

/**
 * Delete all forum data for a tenant
 */
export async function deleteAllForTenant(expertId: string): Promise<number> {
  console.log('[DBG][forumRepository] Deleting all data for tenant:', expertId);

  let deletedCount = 0;
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await docClient.send(
      new QueryCommand({
        TableName: Tables.DISCUSSIONS,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': ForumPK.TENANT(expertId),
        },
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of result.Items || []) {
      await docClient.send(
        new DeleteCommand({
          TableName: Tables.DISCUSSIONS,
          Key: { PK: item.PK, SK: item.SK },
        })
      );
      deletedCount++;
    }

    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  console.log('[DBG][forumRepository] Deleted', deletedCount, 'items');
  return deletedCount;
}
