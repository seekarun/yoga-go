/**
 * Blog Like Repository for DynamoDB operations
 * Handles like/unlike operations for blog posts
 *
 * Uses dedicated BLOG table (yoga-go-blog)
 *
 * Access Patterns:
 * - Check if user liked post: PK=LIKES#{postId}, SK={userId}
 * - Get user's liked posts: PK=USERLIKES#{userId}, SK={postId}
 */

import { GetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, BlogPK, EntityType } from '../dynamodb';
import type { BlogLike } from '@/types';
import { incrementLikeCount } from './blogPostRepository';

/**
 * Toggle like status for a user on a post
 * Returns the new like status
 */
export async function toggleLike(postId: string, userId: string): Promise<{ liked: boolean }> {
  console.log('[DBG][blogLikeRepository] Toggling like for post:', postId, 'user:', userId);

  // Check if already liked
  const isLiked = await getLikeStatus(postId, userId);

  if (isLiked) {
    // Unlike: Remove the like
    await removeLike(postId, userId);
    return { liked: false };
  } else {
    // Like: Add the like
    await addLike(postId, userId);
    return { liked: true };
  }
}

/**
 * Check if a user has liked a post
 */
export async function getLikeStatus(postId: string, userId: string): Promise<boolean> {
  console.log('[DBG][blogLikeRepository] Checking like status for post:', postId, 'user:', userId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.BLOG,
      Key: {
        PK: BlogPK.LIKES(postId),
        SK: userId,
      },
    })
  );

  const isLiked = !!result.Item;
  console.log('[DBG][blogLikeRepository] Like status:', isLiked);
  return isLiked;
}

/**
 * Add a like (internal function)
 */
async function addLike(postId: string, userId: string): Promise<void> {
  console.log('[DBG][blogLikeRepository] Adding like for post:', postId);

  const now = new Date().toISOString();

  const like: BlogLike = {
    postId,
    userId,
    createdAt: now,
  };

  // Dual-write: Store both for post lookup and user lookup
  const writeRequests = [
    // 1. Post's likes: PK=LIKES#{postId}, SK={userId}
    {
      PutRequest: {
        Item: {
          PK: BlogPK.LIKES(postId),
          SK: userId,
          entityType: EntityType.BLOG_LIKE,
          ...like,
        },
      },
    },
    // 2. User's likes: PK=USERLIKES#{userId}, SK={postId}
    {
      PutRequest: {
        Item: {
          PK: BlogPK.USER_LIKES(userId),
          SK: postId,
          entityType: EntityType.BLOG_LIKE,
          ...like,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.BLOG]: writeRequests,
      },
    })
  );

  // Increment like count on the post
  await incrementLikeCount(postId, 1);

  console.log('[DBG][blogLikeRepository] Like added');
}

/**
 * Remove a like (internal function)
 */
async function removeLike(postId: string, userId: string): Promise<void> {
  console.log('[DBG][blogLikeRepository] Removing like for post:', postId);

  // Dual-write: Delete both entries
  const deleteRequests = [
    {
      DeleteRequest: {
        Key: {
          PK: BlogPK.LIKES(postId),
          SK: userId,
        },
      },
    },
    {
      DeleteRequest: {
        Key: {
          PK: BlogPK.USER_LIKES(userId),
          SK: postId,
        },
      },
    },
  ];

  await docClient.send(
    new BatchWriteCommand({
      RequestItems: {
        [Tables.BLOG]: deleteRequests,
      },
    })
  );

  // Decrement like count on the post
  await incrementLikeCount(postId, -1);

  console.log('[DBG][blogLikeRepository] Like removed');
}
