// Post Types - Social media style posts (Instagram/Twitter)

import type { BaseEntity } from "./base";

/**
 * Post status
 */
export type PostStatus = "draft" | "published";

/**
 * Post media
 */
export interface PostMedia {
  type: "image" | "video";
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

/**
 * Post entity
 */
export interface Post extends BaseEntity {
  expertId: string;
  content: string;
  media?: PostMedia[];
  status: PostStatus;
  publishedAt?: string;
  likeCount: number;
  commentCount: number;
}

/**
 * Post comment
 */
export interface PostComment extends BaseEntity {
  postId: string;
  expertId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  editedAt?: string;
}

/**
 * Post like
 */
export interface PostLike {
  postId: string;
  userId: string;
  createdAt: string;
}

// Legacy aliases for backward compatibility
export type BlogPostStatus = PostStatus;
export type BlogPost = Post;
export type BlogComment = PostComment;
export type BlogLike = PostLike;
