/**
 * Post Repository for DynamoDB operations
 * Handles CRUD operations for social-style posts (Instagram/Twitter-like)
 *
 * Uses dedicated BLOG table (yoga-go-blog)
 *
 * Access Patterns:
 * - List posts by expert: PK=EXPERT#{expertId}, SK=POST#{postId}
 * - Direct lookup: PK=POST#{postId}, SK=META
 */

import { GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, BlogPK, EntityType } from '../dynamodb';
import type { Post, PostMedia, PostStatus } from '@/types';

// Helper to generate a unique post ID
const generatePostId = () => `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;

export interface CreatePostInput {
  expertId: string;
  content: string; // Plain text, max 500 chars
  media?: PostMedia[];
  status?: PostStatus;
}

export interface UpdatePostInput {
  content?: string;
  media?: PostMedia[];
  status?: PostStatus;
}

/**
 * Create a new post
 * Uses dual-write pattern for efficient lookups
 */
export async function createPost(input: CreatePostInput): Promise<Post> {
  console.log('[DBG][postRepository] Creating post for expert:', input.expertId);

  const now = new Date().toISOString();
  const postId = generatePostId();

  // Validate content length
  const content = (input.content || '').substring(0, 500);

  // Validate media (max 10 items)
  const media = (input.media || []).slice(0, 10);

  const post: Post = {
    id: postId,
    expertId: input.expertId,
    content,
    media: media.length > 0 ? media : undefined,
    status: input.status || 'draft',
    publishedAt: input.status === 'published' ? now : undefined,
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. Expert post listing: PK=EXPERT#{expertId}, SK=POST#{postId}
    {
      PutRequest: {
        Item: {
          PK: BlogPK.EXPERT(input.expertId),
          SK: `POST#${postId}`,
          entityType: EntityType.BLOG_POST,
          ...post,
        },
      },
    },
    // 2. Direct post lookup: PK=POST#{postId}, SK=META
    {
      PutRequest: {
        Item: {
          PK: BlogPK.POST(postId),
          SK: 'META',
          entityType: EntityType.BLOG_POST,
          ...post,
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

  console.log('[DBG][postRepository] Post created:', postId);
  return post;
}

/**
 * Get a post by ID
 * Uses direct lookup pattern
 */
export async function getPostById(postId: string): Promise<Post | null> {
  console.log('[DBG][postRepository] Getting post:', postId);

  const result = await docClient.send(
    new GetCommand({
      TableName: Tables.BLOG,
      Key: {
        PK: BlogPK.POST(postId),
        SK: 'META',
      },
    })
  );

  if (!result.Item) {
    console.log('[DBG][postRepository] Post not found:', postId);
    return null;
  }

  return mapToPost(result.Item);
}

/**
 * Get all posts for an expert
 * Optionally filter by status
 */
export async function getPostsByExpert(
  expertId: string,
  includeUnpublished: boolean = false
): Promise<Post[]> {
  console.log('[DBG][postRepository] Getting posts for expert:', expertId);

  const result = await docClient.send(
    new QueryCommand({
      TableName: Tables.BLOG,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
      ExpressionAttributeValues: {
        ':pk': BlogPK.EXPERT(expertId),
        ':skPrefix': 'POST#',
      },
      ScanIndexForward: false, // Most recent first
    })
  );

  let posts = (result.Items || []).map(mapToPost);

  // Filter by status if needed
  if (!includeUnpublished) {
    posts = posts.filter(post => post.status === 'published');
  }

  // Sort by publishedAt or createdAt (newest first)
  posts.sort((a, b) => {
    const dateA = a.publishedAt || a.createdAt || '';
    const dateB = b.publishedAt || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  console.log('[DBG][postRepository] Found', posts.length, 'posts');
  return posts;
}

/**
 * Update a post
 * Updates both dual-write copies
 */
export async function updatePost(postId: string, updates: UpdatePostInput): Promise<Post | null> {
  console.log('[DBG][postRepository] Updating post:', postId);

  // First get the current post
  const current = await getPostById(postId);
  if (!current) {
    console.log('[DBG][postRepository] Post not found for update:', postId);
    return null;
  }

  const now = new Date().toISOString();

  // Handle status transition
  let publishedAt = current.publishedAt;
  if (updates.status === 'published' && current.status !== 'published') {
    publishedAt = now;
  } else if (updates.status === 'draft') {
    publishedAt = undefined;
  }

  // Validate content if provided
  const content =
    updates.content !== undefined ? updates.content.substring(0, 500) : current.content;

  // Validate media if provided (max 10 items)
  const media = updates.media !== undefined ? updates.media.slice(0, 10) : current.media;

  const updatedPost: Post = {
    ...current,
    content,
    media: media && media.length > 0 ? media : undefined,
    status: updates.status || current.status,
    publishedAt,
    updatedAt: now,
  };

  // Dual-write: Update both copies
  const writeRequests = [
    {
      PutRequest: {
        Item: {
          PK: BlogPK.EXPERT(current.expertId),
          SK: `POST#${postId}`,
          entityType: EntityType.BLOG_POST,
          ...updatedPost,
        },
      },
    },
    {
      PutRequest: {
        Item: {
          PK: BlogPK.POST(postId),
          SK: 'META',
          entityType: EntityType.BLOG_POST,
          ...updatedPost,
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

  console.log('[DBG][postRepository] Post updated:', postId);
  return updatedPost;
}

/**
 * Delete a post
 * Deletes both dual-write copies
 */
export async function deletePost(postId: string): Promise<boolean> {
  console.log('[DBG][postRepository] Deleting post:', postId);

  // First get the post to find the expertId
  const post = await getPostById(postId);
  if (!post) {
    console.log('[DBG][postRepository] Post not found for deletion:', postId);
    return false;
  }

  const deleteRequests = [
    {
      DeleteRequest: {
        Key: {
          PK: BlogPK.EXPERT(post.expertId),
          SK: `POST#${post.id}`,
        },
      },
    },
    {
      DeleteRequest: {
        Key: {
          PK: BlogPK.POST(postId),
          SK: 'META',
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

  console.log('[DBG][postRepository] Post deleted:', postId);
  return true;
}

/**
 * Increment comment count on a post
 */
export async function incrementCommentCount(postId: string, delta: number): Promise<void> {
  console.log('[DBG][postRepository] Incrementing comment count:', postId, delta);

  const post = await getPostById(postId);
  if (!post) return;

  const updatedPost: Post = {
    ...post,
    commentCount: Math.max(0, post.commentCount + delta),
    updatedAt: new Date().toISOString(),
  };

  const writeRequests = [
    {
      PutRequest: {
        Item: {
          PK: BlogPK.EXPERT(post.expertId),
          SK: `POST#${postId}`,
          entityType: EntityType.BLOG_POST,
          ...updatedPost,
        },
      },
    },
    {
      PutRequest: {
        Item: {
          PK: BlogPK.POST(postId),
          SK: 'META',
          entityType: EntityType.BLOG_POST,
          ...updatedPost,
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
}

/**
 * Increment like count on a post
 */
export async function incrementLikeCount(postId: string, delta: number): Promise<void> {
  console.log('[DBG][postRepository] Incrementing like count:', postId, delta);

  const post = await getPostById(postId);
  if (!post) return;

  const updatedPost: Post = {
    ...post,
    likeCount: Math.max(0, post.likeCount + delta),
    updatedAt: new Date().toISOString(),
  };

  const writeRequests = [
    {
      PutRequest: {
        Item: {
          PK: BlogPK.EXPERT(post.expertId),
          SK: `POST#${postId}`,
          entityType: EntityType.BLOG_POST,
          ...updatedPost,
        },
      },
    },
    {
      PutRequest: {
        Item: {
          PK: BlogPK.POST(postId),
          SK: 'META',
          entityType: EntityType.BLOG_POST,
          ...updatedPost,
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
}

/**
 * Map DynamoDB item to Post type
 */
function mapToPost(item: Record<string, unknown>): Post {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    content: (item.content as string) || '',
    media: item.media as PostMedia[] | undefined,
    status: (item.status as PostStatus) || 'draft',
    publishedAt: item.publishedAt as string | undefined,
    likeCount: (item.likeCount as number) || 0,
    commentCount: (item.commentCount as number) || 0,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
