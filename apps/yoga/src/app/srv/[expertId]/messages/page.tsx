'use client';

import LoadingSpinner from '@/components/LoadingSpinner';
import type { ForumThreadForDashboard } from '@/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ForumPostForm } from '@/components/forum';
import { useNotificationContextOptional } from '@/contexts/NotificationContext';

export default function MessagesPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [forumThreads, setForumThreads] = useState<ForumThreadForDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [forumStats, setForumStats] = useState({
    totalThreads: 0,
    newThreads: 0,
    threadsWithNewReplies: 0,
  });
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Listen for new message notifications to auto-refresh
  const notificationContext = useNotificationContextOptional();
  const messageNotificationCountRef = useRef(0);

  const fetchForumThreads = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][messages] Fetching all forum threads');

      const response = await fetch('/data/app/expert/me/forum?limit=100');
      const data = await response.json();

      if (data.success) {
        setForumThreads(data.data || []);
        if (data.stats) {
          setForumStats(data.stats);
        }
      }
    } catch (err) {
      console.error('[DBG][messages] Error fetching forum threads:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForumThreads();
  }, [fetchForumThreads]);

  // Auto-refresh when new message notifications arrive
  useEffect(() => {
    if (!notificationContext) return;

    const messageNotifications = notificationContext.notifications.filter(
      n => n.type === 'forum_thread' || n.type === 'forum_reply'
    );
    const currentCount = messageNotifications.length;

    // Only refresh if count increased (new message arrived)
    if (
      currentCount > messageNotificationCountRef.current &&
      messageNotificationCountRef.current > 0
    ) {
      console.log('[DBG][messages] New message notification detected, refreshing threads');
      fetchForumThreads();
    }

    messageNotificationCountRef.current = currentCount;
  }, [notificationContext, fetchForumThreads]);

  const formatForumDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatContextLabel = (thread: ForumThreadForDashboard) => {
    if (thread.sourceTitle) return thread.sourceTitle;

    const parts = thread.context.split('.');
    if (parts[0] === 'blog') return 'Blog Post';
    if (parts[0] === 'course') {
      if (parts.length >= 4 && parts[2] === 'lesson') {
        return 'Course Lesson';
      }
      return 'Course';
    }
    if (parts[0] === 'community') return 'Community';
    return thread.contextType || 'Discussion';
  };

  const getContextIcon = (contextType: string) => {
    switch (contextType) {
      case 'blog':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
            />
          </svg>
        );
      case 'course':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        );
    }
  };

  const toggleThreadExpanded = (threadId: string) => {
    setExpandedThreads(prev => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  };

  // Handle clicking on a thread row - expand and mark as read
  const handleThreadClick = (thread: ForumThreadForDashboard) => {
    // Expand if not already expanded
    if (!expandedThreads.has(thread.id)) {
      setExpandedThreads(prev => new Set(prev).add(thread.id));
    }
    // Mark as read if unread
    if (thread.isNew || thread.hasNewReplies) {
      handleMarkThreadAsRead(thread.id);
    }
  };

  const handleMarkThreadAsRead = async (threadId: string) => {
    try {
      const response = await fetch('/data/app/expert/me/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      });
      const data = await response.json();
      if (data.success) {
        setForumThreads(prev =>
          prev.map(t =>
            t.id === threadId ? { ...t, isNew: false, hasNewReplies: false, newReplyCount: 0 } : t
          )
        );
        setForumStats(prev => ({
          ...prev,
          newThreads: Math.max(
            0,
            prev.newThreads - (forumThreads.find(t => t.id === threadId)?.isNew ? 1 : 0)
          ),
          threadsWithNewReplies: Math.max(
            0,
            prev.threadsWithNewReplies -
              (forumThreads.find(t => t.id === threadId)?.hasNewReplies &&
              !forumThreads.find(t => t.id === threadId)?.isNew
                ? 1
                : 0)
          ),
        }));

        // Clear related notifications
        if (notificationContext) {
          const relatedNotifications = notificationContext.notifications.filter(n => {
            if (n.type !== 'forum_thread' && n.type !== 'forum_reply') return false;
            const metadata = n.metadata as { threadId?: string; replyId?: string } | undefined;
            return metadata?.threadId === threadId || n.metadata?.threadId === threadId;
          });
          for (const notification of relatedNotifications) {
            if (!notification.isRead) {
              notificationContext.markAsRead(notification.id);
            }
          }
        }
      }
    } catch (err) {
      console.error('[DBG][messages] Error marking thread as read:', err);
    }
  };

  const handleReplySubmit = async (threadId: string, content: string) => {
    try {
      setSubmittingReply(true);
      const response = await fetch(`/data/forum/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, expertId }),
      });
      const data = await response.json();
      if (data.success && data.data) {
        setForumThreads(prev =>
          prev.map(t =>
            t.id === threadId
              ? {
                  ...t,
                  replies: [...t.replies, data.data],
                  replyCount: t.replyCount + 1,
                }
              : t
          )
        );
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('[DBG][messages] Error submitting reply:', err);
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleLike = async (messageId: string, isLiked: boolean, threadId?: string) => {
    // Determine the actual thread ID (messageId if liking thread, threadId if liking reply)
    const actualThreadId = threadId || messageId;

    // Check if thread has unread status and mark as read
    const thread = forumThreads.find(t => t.id === actualThreadId);
    if (thread && (thread.isNew || thread.hasNewReplies)) {
      handleMarkThreadAsRead(actualThreadId);
    }

    try {
      const response = await fetch(`/data/forum/threads/${messageId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId }),
      });
      const data = await response.json();
      if (data.success) {
        setForumThreads(prev =>
          prev.map(t => {
            if (t.id === messageId) {
              return {
                ...t,
                userLiked: !isLiked,
                likeCount: isLiked ? t.likeCount - 1 : t.likeCount + 1,
              };
            }
            if (threadId && t.id === threadId) {
              return {
                ...t,
                replies: t.replies.map(r =>
                  r.id === messageId
                    ? {
                        ...r,
                        userLiked: !isLiked,
                        likeCount: isLiked ? r.likeCount - 1 : r.likeCount + 1,
                      }
                    : r
                ),
              };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.error('[DBG][messages] Error toggling like:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading messages..." />
      </div>
    );
  }

  return (
    <div className="px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">All Messages</h1>
          <span className="text-sm text-gray-500">({forumStats.totalThreads} total)</span>
          {forumStats.newThreads + forumStats.threadsWithNewReplies > 0 && (
            <span
              className="px-2.5 py-0.5 text-xs font-medium text-white rounded-full"
              style={{ background: 'var(--color-primary)' }}
            >
              {forumStats.newThreads + forumStats.threadsWithNewReplies} unread
            </span>
          )}
        </div>
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {forumThreads.length === 0 ? (
          <div className="p-8 text-center">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-gray-500">No messages yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Discussions from your blog posts and courses will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {forumThreads.map(thread => {
              const isExpanded = expandedThreads.has(thread.id);
              const hasUnread = thread.isNew || thread.hasNewReplies;

              return (
                <div key={thread.id} className={hasUnread ? 'bg-blue-50/30' : ''}>
                  {/* Thread header - clickable */}
                  <div
                    className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleThreadClick(thread)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread indicator */}
                      <div className="flex-shrink-0 pt-1.5">
                        {hasUnread ? (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: 'var(--color-primary)' }}
                          />
                        ) : (
                          <div className="w-2 h-2" />
                        )}
                      </div>

                      <div className="flex-shrink-0 mt-0.5 text-gray-400">
                        {getContextIcon(thread.contextType)}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Context badge and indicators */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                            {formatContextLabel(thread)}
                          </span>
                          {thread.isNew && (
                            <span
                              className="text-xs px-2 py-0.5 rounded text-white"
                              style={{ background: 'var(--color-primary)' }}
                            >
                              New
                            </span>
                          )}
                          {thread.hasNewReplies && !thread.isNew && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                              {thread.newReplyCount} new{' '}
                              {thread.newReplyCount === 1 ? 'reply' : 'replies'}
                            </span>
                          )}
                          {thread.contextVisibility === 'private' && (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                              Private
                            </span>
                          )}
                        </div>

                        {/* Thread content */}
                        <p className="text-sm text-gray-900">{thread.content}</p>

                        {/* Thread metadata */}
                        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                          <span className="font-medium">{thread.userName}</span>
                          <span>-</span>
                          <span>{formatForumDate(thread.createdAt || '')}</span>
                          <span className="text-gray-400">
                            {thread.likeCount} {thread.likeCount === 1 ? 'like' : 'likes'}
                          </span>
                        </div>

                        {/* Actions bar - stop propagation to prevent row click */}
                        <div
                          className="flex items-center gap-3 mt-2"
                          onClick={e => e.stopPropagation()}
                        >
                          {/* Expand/collapse replies button */}
                          {(thread.replies.length > 0 || thread.replyCount > 0) && (
                            <button
                              onClick={() => toggleThreadExpanded(thread.id)}
                              className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              <svg
                                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                              {Math.max(thread.replies.length, thread.replyCount)}{' '}
                              {Math.max(thread.replies.length, thread.replyCount) === 1
                                ? 'reply'
                                : 'replies'}
                            </button>
                          )}

                          {/* Reply button */}
                          <button
                            onClick={() =>
                              setReplyingTo(replyingTo === thread.id ? null : thread.id)
                            }
                            className="text-xs font-medium text-gray-500 hover:text-gray-700"
                          >
                            Reply
                          </button>

                          {/* Like button */}
                          <button
                            onClick={() => handleLike(thread.id, thread.userLiked)}
                            className={`text-xs font-medium flex items-center gap-1 ${
                              thread.userLiked
                                ? 'text-red-500 hover:text-red-600'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                          >
                            <svg
                              className="w-3.5 h-3.5"
                              fill={thread.userLiked ? 'currentColor' : 'none'}
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                              />
                            </svg>
                            {thread.userLiked ? 'Liked' : 'Like'}
                          </button>

                          {/* Mark as read button */}
                          {hasUnread && (
                            <button
                              onClick={() => handleMarkThreadAsRead(thread.id)}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700"
                            >
                              Mark as read
                            </button>
                          )}

                          {/* View in context link */}
                          {thread.sourceUrl && (
                            <Link
                              href={thread.sourceUrl}
                              className="text-xs font-medium text-gray-500 hover:text-gray-700 ml-auto"
                            >
                              View in context
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Replies section (collapsible) */}
                  {isExpanded && thread.replies.length > 0 && (
                    <div className="pl-12 pr-4 pb-3 space-y-2">
                      {thread.replies.map(reply => (
                        <div key={reply.id} className="pl-4 border-l-2 border-gray-200">
                          <p className="text-sm text-gray-800">{reply.content}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span
                              className={`font-medium ${reply.userRole === 'expert' ? 'text-blue-600' : ''}`}
                            >
                              {reply.userName}
                              {reply.userRole === 'expert' && ' (You)'}
                            </span>
                            <span>-</span>
                            <span>{formatForumDate(reply.createdAt || '')}</span>
                            <span className="text-gray-400">
                              {reply.likeCount} {reply.likeCount === 1 ? 'like' : 'likes'}
                            </span>
                            <button
                              onClick={() => handleLike(reply.id, reply.userLiked, thread.id)}
                              className={`font-medium flex items-center gap-1 ${
                                reply.userLiked
                                  ? 'text-red-500 hover:text-red-600'
                                  : 'text-gray-400 hover:text-gray-600'
                              }`}
                            >
                              <svg
                                className="w-3 h-3"
                                fill={reply.userLiked ? 'currentColor' : 'none'}
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                                />
                              </svg>
                              {reply.userLiked ? 'Liked' : 'Like'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply form */}
                  {replyingTo === thread.id && (
                    <div className="pl-12 pr-4 pb-4">
                      <ForumPostForm
                        placeholder="Write a reply..."
                        submitLabel="Reply"
                        onSubmit={async content => {
                          await handleReplySubmit(thread.id, content);
                        }}
                        disabled={submittingReply}
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
