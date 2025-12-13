/**
 * Blog Comment Repository for DynamoDB operations
 * Handles CRUD operations for blog post comments
 *
 * Access Patterns:
 * - List comments by post: PK=BLOGCMT#{postId}, SK={createdAt}#{commentId}
 */

import { PutCommand, QueryCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, CorePK, EntityType } from '../dynamodb';
import type { BlogComment } from '@/types';
import { incrementCommentCount } from './blogPostRepository';

// Helper to generate a unique comment ID
const generateCommentId = () => `cmt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

export interface CreateBlogCommentInput {
  postId: string;
  expertId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
}

/**
 * Create a new blog comment
 */
export async function createBlogComment(input: CreateBlogCommentInput): Promise<BlogComment> {
  console.log('[DBG][blogCommentRepository] Creating comment for post:', input.postId);

  const now = new Date().toISOString();
  const commentId = generateCommentId();

  const comment: BlogComment = {
    id: commentId,
    postId: input.postId,
    expertId: input.expertId,
    userId: input.userId,
    userName: input.userName,
    userAvatar: input.userAvatar,
    content: input.content,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: CorePK.BLOG_COMMENT(input.postId),
        SK: `${now}#${commentId}`,
        entityType: EntityType.BLOG_COMMENT,
        ...comment,
      },
    })
  );

  // Increment comment count on the post
  await incrementCommentCount(input.postId, 1);

  console.log('[DBG][blogCommentRepository] Comment created:', commentId);
  return comment;
}

/**
 * Get comments for a blog post
 */
export async function getCommentsByPost(postId: string): Promise<BlogComment[]> {
  console.log('[DBG][blogCommentRepository] Getting comments for post:', postId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': CorePK.BLOG_COMMENT(postId),
      },
      ScanIndexForward: true, // Oldest first
    })
  );

  const comments = (result.Items || []).map(mapToBlogComment);
  console.log('[DBG][blogCommentRepository] Found', comments.length, 'comments');
  return comments;
}

/**
 * Get a comment by ID
 * Note: Requires scanning or knowing the SK, so we query and filter
 */
export async function getCommentById(
  postId: string,
  commentId: string
): Promise<BlogComment | null> {
  console.log('[DBG][blogCommentRepository] Getting comment:', commentId);

  // Query all comments for the post and filter
  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.CORE,
      KeyConditionExpression: 'PK = :pk',
      FilterExpression: 'id = :commentId',
      ExpressionAttributeValues: {
        ':pk': CorePK.BLOG_COMMENT(postId),
        ':commentId': commentId,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    console.log('[DBG][blogCommentRepository] Comment not found:', commentId);
    return null;
  }

  return mapToBlogComment(result.Items[0]);
}

/**
 * Update a comment
 */
export async function updateBlogComment(
  postId: string,
  commentId: string,
  content: string
): Promise<BlogComment | null> {
  console.log('[DBG][blogCommentRepository] Updating comment:', commentId);

  // First get the comment to find its SK
  const existingComment = await getCommentById(postId, commentId);
  if (!existingComment) {
    console.log('[DBG][blogCommentRepository] Comment not found for update:', commentId);
    return null;
  }

  const now = new Date().toISOString();
  const sk = `${existingComment.createdAt}#${commentId}`;

  const updatedComment: BlogComment = {
    ...existingComment,
    content: content,
    editedAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: Tables.CORE,
      Item: {
        PK: CorePK.BLOG_COMMENT(postId),
        SK: sk,
        entityType: EntityType.BLOG_COMMENT,
        ...updatedComment,
      },
    })
  );

  console.log('[DBG][blogCommentRepository] Comment updated:', commentId);
  return updatedComment;
}

/**
 * Delete a comment
 */
export async function deleteBlogComment(postId: string, commentId: string): Promise<boolean> {
  console.log('[DBG][blogCommentRepository] Deleting comment:', commentId);

  // First get the comment to find its SK
  const existingComment = await getCommentById(postId, commentId);
  if (!existingComment) {
    console.log('[DBG][blogCommentRepository] Comment not found for deletion:', commentId);
    return false;
  }

  const sk = `${existingComment.createdAt}#${commentId}`;

  await docClient.send(
    new DeleteCommand({
      TableName: Tables.CORE,
      Key: {
        PK: CorePK.BLOG_COMMENT(postId),
        SK: sk,
      },
    })
  );

  // Decrement comment count on the post
  await incrementCommentCount(postId, -1);

  console.log('[DBG][blogCommentRepository] Comment deleted:', commentId);
  return true;
}

/**
 * Map DynamoDB item to BlogComment type
 */
function mapToBlogComment(item: Record<string, unknown>): BlogComment {
  return {
    id: item.id as string,
    postId: item.postId as string,
    expertId: item.expertId as string,
    userId: item.userId as string,
    userName: item.userName as string,
    userAvatar: item.userAvatar as string | undefined,
    content: item.content as string,
    editedAt: item.editedAt as string | undefined,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
