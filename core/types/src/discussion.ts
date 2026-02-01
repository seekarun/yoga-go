// Discussion Types - Discussion and forum types

import type { BaseEntity } from "./base";
import type { UserRole } from "./user";

/**
 * Vote type
 */
export type VoteType = "up" | "down";

/**
 * Discussion entity (course/lesson discussions)
 */
export interface Discussion extends BaseEntity {
  courseId: string;
  lessonId: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  userAvatar?: string;
  content: string;
  parentId?: string;
  upvotes: number;
  downvotes: number;
  isPinned: boolean;
  isResolved: boolean;
  isHidden: boolean;
  editedAt?: string;
  deletedAt?: string;
}

/**
 * Discussion vote
 */
export interface DiscussionVote extends BaseEntity {
  discussionId: string;
  userId: string;
  voteType: VoteType;
}

/**
 * Discussion thread with replies
 */
export interface DiscussionThread extends Discussion {
  replies: DiscussionThread[];
  userVote?: VoteType;
  netScore: number;
}

// ========================================
// Forum Types (Slack-like Discussion System)
// ========================================

/**
 * Forum context visibility
 */
export type ForumContextVisibility = "private" | "public";

/**
 * Forum context type
 */
export type ForumContextType = "course" | "blog" | "webinar" | "community";

/**
 * Forum access level
 */
export type ForumAccessLevel = "none" | "view" | "participate";

/**
 * Base forum message
 */
export interface ForumMessage extends BaseEntity {
  context: string;
  contextType: ForumContextType;
  contextVisibility: ForumContextVisibility;
  expertId: string;
  userId: string;
  userRole: UserRole;
  userName: string;
  userAvatar?: string;
  content: string;
  likeCount: number;
  editedAt?: string;
  sourceTitle?: string;
  sourceUrl?: string;
}

/**
 * Forum thread (top-level message)
 */
export interface ForumThread extends ForumMessage {
  replyCount: number;
  expertLastReadAt?: string;
}

/**
 * Forum reply
 */
export interface ForumReply extends ForumMessage {
  threadId: string;
}

/**
 * Forum like
 */
export interface ForumLike {
  visitorId: string;
  likedAt: string;
}

/**
 * Forum reply with like status
 */
export interface ForumReplyWithLike extends ForumReply {
  userLiked: boolean;
}

/**
 * Forum thread with replies
 */
export interface ForumThreadWithReplies extends ForumThread {
  replies: ForumReplyWithLike[];
  userLiked: boolean;
}

/**
 * Forum thread for expert dashboard
 */
export interface ForumThreadForDashboard extends ForumThreadWithReplies {
  isNew: boolean;
  hasNewReplies: boolean;
  newReplyCount: number;
}
