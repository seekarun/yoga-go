/**
 * Blog Post Repository for DynamoDB operations
 * Handles CRUD operations for expert blog posts
 *
 * Uses dedicated BLOG table (yoga-go-blog)
 *
 * Access Patterns:
 * - List posts by expert: PK=EXPERT#{expertId}, SK=POST#{publishedAt}#{postId}
 * - Direct lookup: PK=POST#{postId}, SK=META
 */

import { GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, Tables, BlogPK, EntityType } from '../dynamodb';
import type { BlogPost, BlogPostAttachment, BlogPostStatus } from '@/types';

// Helper to generate a unique post ID
const generatePostId = () => `post_${Date.now()}_${Math.random().toString(36).substring(7)}`;

// Helper to generate URL-friendly slug from title
const generateSlug = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
};

// Helper to calculate read time from content (rough estimate)
const calculateReadTime = (content: string): number => {
  // Average reading speed: 200 words per minute
  // Tiptap content is JSON, so we parse and count text content
  try {
    const parsed = JSON.parse(content);
    const text = extractTextFromTiptap(parsed);
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  } catch {
    return 1;
  }
};

// Extract text from Tiptap JSON content
const extractTextFromTiptap = (node: Record<string, unknown>): string => {
  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text;
  }
  if (Array.isArray(node.content)) {
    return node.content.map(n => extractTextFromTiptap(n as Record<string, unknown>)).join(' ');
  }
  return '';
};

// Generate excerpt from content
const generateExcerpt = (content: string, maxLength: number = 160): string => {
  try {
    const parsed = JSON.parse(content);
    const text = extractTextFromTiptap(parsed);
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...';
  } catch {
    return '';
  }
};

export interface CreateBlogPostInput {
  expertId: string;
  title: string;
  content: string;
  coverImage?: string;
  status?: BlogPostStatus;
  tags?: string[];
  attachments?: BlogPostAttachment[];
  excerpt?: string;
}

export interface UpdateBlogPostInput {
  title?: string;
  content?: string;
  coverImage?: string;
  status?: BlogPostStatus;
  tags?: string[];
  attachments?: BlogPostAttachment[];
  excerpt?: string;
}

/**
 * Create a new blog post
 * Uses dual-write pattern for efficient lookups
 */
export async function createBlogPost(input: CreateBlogPostInput): Promise<BlogPost> {
  console.log('[DBG][blogPostRepository] Creating blog post for expert:', input.expertId);

  const now = new Date().toISOString();
  const postId = generatePostId();
  const slug = generateSlug(input.title);
  const readTimeMinutes = calculateReadTime(input.content);
  const excerpt = input.excerpt || generateExcerpt(input.content);

  const blogPost: BlogPost = {
    id: postId,
    expertId: input.expertId,
    title: input.title,
    slug: slug,
    excerpt: excerpt,
    content: input.content,
    coverImage: input.coverImage,
    status: input.status || 'draft',
    publishedAt: input.status === 'published' ? now : undefined,
    readTimeMinutes: readTimeMinutes,
    tags: input.tags || [],
    attachments: input.attachments || [],
    likeCount: 0,
    commentCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Dual-write: Multiple items for different access patterns
  const writeRequests = [
    // 1. Expert blog listing: PK=EXPERT#{expertId}, SK=POST#{postId}
    {
      PutRequest: {
        Item: {
          PK: BlogPK.EXPERT(input.expertId),
          SK: `POST#${postId}`,
          entityType: EntityType.BLOG_POST,
          ...blogPost,
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
          ...blogPost,
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

  console.log('[DBG][blogPostRepository] Blog post created:', postId);
  return blogPost;
}

/**
 * Get a blog post by ID
 * Uses direct lookup pattern
 */
export async function getBlogPostById(postId: string): Promise<BlogPost | null> {
  console.log('[DBG][blogPostRepository] Getting blog post:', postId);

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
    console.log('[DBG][blogPostRepository] Blog post not found:', postId);
    return null;
  }

  return mapToBlogPost(result.Item);
}

/**
 * Get all blog posts for an expert
 * Optionally filter by status
 */
export async function getBlogPostsByExpert(
  expertId: string,
  includeUnpublished: boolean = false
): Promise<BlogPost[]> {
  console.log('[DBG][blogPostRepository] Getting blog posts for expert:', expertId);

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

  let posts = (result.Items || []).map(mapToBlogPost);

  // Filter by status if needed
  if (!includeUnpublished) {
    posts = posts.filter(post => post.status === 'published');
  }

  // Sort by publishedAt or createdAt
  posts.sort((a, b) => {
    const dateA = a.publishedAt || a.createdAt || '';
    const dateB = b.publishedAt || b.createdAt || '';
    return dateB.localeCompare(dateA);
  });

  console.log('[DBG][blogPostRepository] Found', posts.length, 'blog posts');
  return posts;
}

/**
 * Update a blog post
 * Updates both dual-write copies
 */
export async function updateBlogPost(
  postId: string,
  updates: UpdateBlogPostInput
): Promise<BlogPost | null> {
  console.log('[DBG][blogPostRepository] Updating blog post:', postId);

  // First get the current post
  const current = await getBlogPostById(postId);
  if (!current) {
    console.log('[DBG][blogPostRepository] Blog post not found for update:', postId);
    return null;
  }

  const now = new Date().toISOString();

  // Recalculate slug and read time if content or title changed
  const slug = updates.title ? generateSlug(updates.title) : current.slug;
  const readTimeMinutes = updates.content
    ? calculateReadTime(updates.content)
    : current.readTimeMinutes;
  const excerpt =
    updates.excerpt || (updates.content ? generateExcerpt(updates.content) : current.excerpt);

  // Handle status transition
  let publishedAt = current.publishedAt;
  if (updates.status === 'published' && current.status !== 'published') {
    publishedAt = now;
  } else if (updates.status === 'draft') {
    publishedAt = undefined;
  }

  const updatedPost: BlogPost = {
    ...current,
    ...updates,
    slug,
    excerpt,
    readTimeMinutes,
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

  console.log('[DBG][blogPostRepository] Blog post updated:', postId);
  return updatedPost;
}

/**
 * Delete a blog post
 * Deletes both dual-write copies
 */
export async function deleteBlogPost(postId: string): Promise<boolean> {
  console.log('[DBG][blogPostRepository] Deleting blog post:', postId);

  // First get the post to find the expertId
  const post = await getBlogPostById(postId);
  if (!post) {
    console.log('[DBG][blogPostRepository] Blog post not found for deletion:', postId);
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

  console.log('[DBG][blogPostRepository] Blog post deleted:', postId);
  return true;
}

/**
 * Increment comment count on a blog post
 */
export async function incrementCommentCount(postId: string, delta: number): Promise<void> {
  console.log('[DBG][blogPostRepository] Incrementing comment count:', postId, delta);

  const post = await getBlogPostById(postId);
  if (!post) return;

  await updateBlogPost(postId, {});
  // Re-fetch and update the count
  const current = await getBlogPostById(postId);
  if (current) {
    const updatedPost: BlogPost = {
      ...current,
      commentCount: Math.max(0, current.commentCount + delta),
    };

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
  }
}

/**
 * Increment like count on a blog post
 */
export async function incrementLikeCount(postId: string, delta: number): Promise<void> {
  console.log('[DBG][blogPostRepository] Incrementing like count:', postId, delta);

  const post = await getBlogPostById(postId);
  if (!post) return;

  const updatedPost: BlogPost = {
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
 * Map DynamoDB item to BlogPost type
 */
function mapToBlogPost(item: Record<string, unknown>): BlogPost {
  return {
    id: item.id as string,
    expertId: item.expertId as string,
    title: item.title as string,
    slug: item.slug as string,
    excerpt: item.excerpt as string,
    content: item.content as string,
    coverImage: item.coverImage as string | undefined,
    status: item.status as BlogPostStatus,
    publishedAt: item.publishedAt as string | undefined,
    readTimeMinutes: (item.readTimeMinutes as number) || 1,
    tags: (item.tags as string[]) || [],
    attachments: (item.attachments as BlogPostAttachment[]) || [],
    likeCount: (item.likeCount as number) || 0,
    commentCount: (item.commentCount as number) || 0,
    createdAt: item.createdAt as string,
    updatedAt: item.updatedAt as string,
  };
}
