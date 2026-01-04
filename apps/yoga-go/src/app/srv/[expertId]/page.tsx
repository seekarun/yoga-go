'use client';

import LoadingSpinner from '@/components/LoadingSpinner';
import { formatPrice } from '@/lib/currency/currencyService';
import type {
  Course,
  Email,
  SupportedCurrency,
  ForumThreadForDashboard,
  ApiResponse,
} from '@/types';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, useRef } from 'react';
import { ForumPostForm } from '@/components/forum';
import { useNotificationContextOptional } from '@/contexts/NotificationContext';

interface StripeBalanceData {
  connected: boolean;
  active?: boolean;
  status?: string;
  balance?: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  };
}

export default function ExpertDashboard() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripeBalance, setStripeBalance] = useState<StripeBalanceData | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Inbox state
  const [emails, setEmails] = useState<Email[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const [emailsLastKey, setEmailsLastKey] = useState<string | undefined>(undefined);
  const [emailsHasMore, setEmailsHasMore] = useState(false);
  const [loadingMoreEmails, setLoadingMoreEmails] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Listen for new notifications to auto-refresh
  const notificationContext = useNotificationContextOptional();
  const emailNotificationCountRef = useRef(0);
  const messageNotificationCountRef = useRef(0);

  // Forum/Messages state
  const [forumThreads, setForumThreads] = useState<ForumThreadForDashboard[]>([]);
  const [loadingForum, setLoadingForum] = useState(true);
  const [forumStats, setForumStats] = useState({
    totalThreads: 0,
    newThreads: 0,
    threadsWithNewReplies: 0,
  });
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  const fetchExpertCourses = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[DBG][expert-dashboard] Fetching courses for expert:', expertId);

      // Fetch all courses for this instructor (both IN_PROGRESS and PUBLISHED)
      const response = await fetch(`/data/courses?instructorId=${expertId}&includeAll=true`);
      const data = await response.json();

      if (data.success) {
        setCourses(data.data || []);
        console.log('[DBG][expert-dashboard] Courses loaded:', data.data);
      } else {
        setError('Failed to load courses');
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching courses:', err);
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, [expertId]);

  const fetchStripeBalance = useCallback(async () => {
    try {
      setLoadingBalance(true);
      console.log('[DBG][expert-dashboard] Fetching Stripe balance');

      const response = await fetch('/api/stripe/connect/balance');
      const data = await response.json();

      if (data.success) {
        setStripeBalance(data.data);
        console.log('[DBG][expert-dashboard] Stripe balance loaded:', data.data);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching Stripe balance:', err);
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const fetchEmails = useCallback(async (append = false, lastKey?: string) => {
    try {
      if (!append) {
        setLoadingEmails(true);
      } else {
        setLoadingMoreEmails(true);
      }

      const queryParams = new URLSearchParams();
      queryParams.set('limit', '20');

      if (lastKey) {
        queryParams.set('lastKey', lastKey);
      }

      console.log('[DBG][expert-dashboard] Fetching emails');

      const response = await fetch(`/data/app/expert/me/inbox?${queryParams.toString()}`);
      const data = await response.json();

      if (data.success && data.data) {
        if (append) {
          setEmails(prev => [...prev, ...data.data.emails]);
        } else {
          setEmails(data.data.emails);
        }
        setUnreadCount(data.data.unreadCount || 0);
        setEmailsLastKey(data.data.lastKey);
        setEmailsHasMore(!!data.data.lastKey);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching emails:', err);
    } finally {
      setLoadingEmails(false);
      setLoadingMoreEmails(false);
    }
  }, []);

  const fetchForumThreads = useCallback(async () => {
    try {
      setLoadingForum(true);
      console.log('[DBG][expert-dashboard] Fetching forum threads');

      const response = await fetch('/data/app/expert/me/forum?limit=50');
      const data = await response.json();

      if (data.success) {
        setForumThreads(data.data || []);
        if (data.stats) {
          setForumStats(data.stats);
        }
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error fetching forum threads:', err);
    } finally {
      setLoadingForum(false);
    }
  }, []);

  const handleEmailClick = async (email: Email) => {
    // Mark as read if not already read
    if (!email.isRead) {
      try {
        await fetch(`/data/app/expert/me/inbox/${email.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: true }),
        });
        setEmails(prev => prev.map(e => (e.id === email.id ? { ...e, isRead: true } : e)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch (err) {
        console.log('[DBG][expert-dashboard] Failed to mark as read:', err);
      }
    }
    router.push(`/srv/${expertId}/inbox/${email.id}`);
  };

  const formatEmailDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

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

    // Parse context string like "blog.post.{postId}" or "course.{courseId}.lesson.{lessonId}"
    const parts = thread.context.split('.');
    if (parts[0] === 'blog') return 'Blog Post';
    if (parts[0] === 'course') {
      if (parts.length >= 4 && parts[2] === 'lesson') {
        return `Course Lesson`;
      }
      return 'Course';
    }
    if (parts[0] === 'community') return 'Community';
    return thread.contextType || 'Discussion';
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

  const handleMarkThreadAsRead = async (threadId: string) => {
    try {
      const response = await fetch('/data/app/expert/me/forum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      });
      const data = await response.json();
      if (data.success) {
        // Update local state
        setForumThreads(prev =>
          prev.map(t =>
            t.id === threadId ? { ...t, isNew: false, hasNewReplies: false, newReplyCount: 0 } : t
          )
        );
        // Update stats
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
      console.error('[DBG][expert-dashboard] Error marking thread as read:', err);
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
        // Add reply to local state
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
      console.error('[DBG][expert-dashboard] Error submitting reply:', err);
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
        // Update local state
        setForumThreads(prev =>
          prev.map(t => {
            // If liking/unliking the thread itself
            if (t.id === messageId) {
              return {
                ...t,
                userLiked: !isLiked,
                likeCount: isLiked ? t.likeCount - 1 : t.likeCount + 1,
              };
            }
            // If liking/unliking a reply within a thread
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
      console.error('[DBG][expert-dashboard] Error toggling like:', err);
    }
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

  useEffect(() => {
    fetchExpertCourses();
    fetchStripeBalance();
    fetchEmails();
    fetchForumThreads();
  }, [fetchExpertCourses, fetchStripeBalance, fetchEmails, fetchForumThreads]);

  // Auto-refresh emails when new email notifications arrive
  useEffect(() => {
    if (!notificationContext) return;

    const emailNotifications = notificationContext.notifications.filter(
      n => n.type === 'email_received'
    );
    const currentCount = emailNotifications.length;

    // Only refresh if count increased (new email arrived)
    if (currentCount > emailNotificationCountRef.current && emailNotificationCountRef.current > 0) {
      console.log('[DBG][expert-dashboard] New email notification detected, refreshing emails');
      fetchEmails();
    }

    emailNotificationCountRef.current = currentCount;
  }, [notificationContext, fetchEmails]);

  // Auto-refresh forum threads when new message notifications arrive
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
      console.log('[DBG][expert-dashboard] New message notification detected, refreshing threads');
      fetchForumThreads();
    }

    messageNotificationCountRef.current = currentCount;
  }, [notificationContext, fetchForumThreads]);

  // Format currency amount (from cents to dollars)
  const formatAmount = (amount: number, currency: string) => {
    return formatPrice(amount / 100, currency as SupportedCurrency);
  };

  // Get total available and pending amounts
  const getEarningsSummary = () => {
    if (!stripeBalance?.balance) return null;

    const available = stripeBalance.balance.available[0] || { amount: 0, currency: 'USD' };
    const pending = stripeBalance.balance.pending[0] || { amount: 0, currency: 'USD' };

    return {
      available: formatAmount(available.amount, available.currency),
      pending: formatAmount(pending.amount, pending.currency),
      currency: available.currency,
    };
  };

  // Open Stripe dashboard in new tab
  const openStripeDashboard = async () => {
    try {
      const response = await fetch('/api/stripe/connect/dashboard', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.data?.url) {
        window.open(data.data.url, '_blank', 'noopener,noreferrer');
      } else {
        console.error('[DBG][expert-dashboard] Failed to get Stripe dashboard URL:', data.error);
      }
    } catch (err) {
      console.error('[DBG][expert-dashboard] Error opening Stripe dashboard:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading dashboard..." />
      </div>
    );
  }

  // Calculate statistics from courses
  const publishedCourses = courses.filter(c => c.status === 'PUBLISHED');
  const totalStudents = courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
  const earnings = getEarningsSummary();

  return (
    <div className="px-6 lg:px-8 py-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Earnings Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Earnings</p>
            <svg
              className="w-6 h-6 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          {loadingBalance ? (
            <div className="animate-pulse">
              <div className="h-9 bg-gray-200 rounded w-24 mb-1" />
              <div className="h-4 bg-gray-100 rounded w-32" />
            </div>
          ) : stripeBalance?.connected && stripeBalance?.active && earnings ? (
            <>
              <p className="text-3xl font-bold text-gray-900">{earnings.available}</p>
              <p className="text-sm text-gray-500 mt-1">
                {earnings.pending !== '$0.00' && `${earnings.pending} pending`}
                {earnings.pending === '$0.00' && 'Available balance'}
              </p>
              <button
                onClick={openStripeDashboard}
                className="text-xs text-blue-600 hover:underline mt-2 inline-flex items-center gap-1"
              >
                Go to Stripe Dashboard
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                  />
                </svg>
              </button>
            </>
          ) : stripeBalance?.connected && !stripeBalance?.active ? (
            <>
              <p className="text-lg font-medium text-amber-600">Setup incomplete</p>
              <Link
                href={`/srv/${expertId}/settings`}
                className="text-xs hover:underline mt-1 inline-block"
                style={{ color: 'var(--color-primary)' }}
              >
                Complete Stripe setup →
              </Link>
            </>
          ) : (
            <>
              <p className="text-lg font-medium text-gray-400">Not connected</p>
              <Link
                href={`/srv/${expertId}/settings`}
                className="text-xs hover:underline mt-1 inline-block"
                style={{ color: 'var(--color-primary)' }}
              >
                Connect Stripe →
              </Link>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Total Students</p>
            <svg
              className="w-6 h-6 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalStudents.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Across all courses</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Published Courses</p>
            <svg
              className="w-6 h-6 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
          <p className="text-3xl font-bold text-gray-900">{publishedCourses.length}</p>
          <p className="text-sm text-gray-500 mt-1">Live courses</p>
        </div>
      </div>

      {/* Unread Messages / Forum Threads */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Unread Messages</h2>
            {forumStats.newThreads + forumStats.threadsWithNewReplies > 0 && (
              <span
                className="px-2.5 py-0.5 text-xs font-medium text-white rounded-full"
                style={{ background: 'var(--color-primary)' }}
              >
                {forumStats.newThreads + forumStats.threadsWithNewReplies} unread
              </span>
            )}
          </div>
          <Link
            href={`/srv/${expertId}/messages`}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            View all messages →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loadingForum ? (
            <div className="p-8 text-center">
              <LoadingSpinner size="md" message="Loading messages..." />
            </div>
          ) : forumThreads.filter(t => t.isNew || t.hasNewReplies).length === 0 ? (
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <p className="text-gray-500">All caught up!</p>
              <p className="text-sm text-gray-400 mt-1">No unread messages at the moment</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {forumThreads
                .filter(t => t.isNew || t.hasNewReplies)
                .map(thread => {
                  const isExpanded = expandedThreads.has(thread.id);

                  return (
                    <div key={thread.id} className="bg-blue-50/30">
                      {/* Thread header - clickable to navigate to context */}
                      <div
                        className="px-4 py-3 cursor-pointer hover:bg-blue-50/50 transition-colors"
                        onClick={() => {
                          if (thread.sourceUrl) {
                            // Navigate to context page with thread highlight param
                            router.push(`${thread.sourceUrl}?highlightThread=${thread.id}`);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {/* Unread indicator */}
                          <div className="flex-shrink-0 pt-1.5">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ background: 'var(--color-primary)' }}
                            />
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
                              {thread.replyCount > 0 && (
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
                                  {thread.replyCount}{' '}
                                  {thread.replyCount === 1 ? 'reply' : 'replies'}
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
                              <button
                                onClick={() => handleMarkThreadAsRead(thread.id)}
                                className="text-xs font-medium text-gray-500 hover:text-gray-700"
                              >
                                Mark as read
                              </button>

                              {/* View in context link */}
                              {thread.sourceUrl && (
                                <Link
                                  href={thread.sourceUrl}
                                  className="text-xs font-medium text-gray-500 hover:text-gray-700 ml-auto"
                                >
                                  View in context →
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

      {/* Inbox Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Inbox</h2>
            {unreadCount > 0 && (
              <span
                className="px-2.5 py-0.5 text-xs font-medium text-white rounded-full"
                style={{ background: 'var(--color-primary)' }}
              >
                {unreadCount} unread
              </span>
            )}
          </div>
          <Link
            href={`/srv/${expertId}/inbox`}
            className="text-sm font-medium hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            View all →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loadingEmails ? (
            <div className="p-8 text-center">
              <LoadingSpinner size="md" message="Loading emails..." />
            </div>
          ) : emails.length === 0 ? (
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
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="text-gray-500">No emails yet</p>
              <p className="text-sm text-gray-400 mt-1">Messages from students will appear here</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-100">
                {emails.map(email => (
                  <button
                    key={email.id}
                    onClick={() => handleEmailClick(email)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      !email.isRead ? 'bg-blue-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Unread indicator */}
                      <div className="flex-shrink-0 pt-2">
                        {!email.isRead ? (
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ background: 'var(--color-primary)' }}
                          />
                        ) : (
                          <div className="w-2 h-2" />
                        )}
                      </div>

                      {/* Email content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <span
                            className={`text-sm truncate ${
                              !email.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'
                            }`}
                          >
                            {email.from.name || email.from.email}
                          </span>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {formatEmailDate(email.receivedAt)}
                          </span>
                        </div>
                        <p
                          className={`text-sm truncate ${
                            !email.isRead ? 'font-medium text-gray-800' : 'text-gray-600'
                          }`}
                        >
                          {email.subject}
                        </p>
                        {email.bodyText && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">
                            {email.bodyText.slice(0, 80)}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Load more button */}
              {emailsHasMore && (
                <div className="p-3 border-t border-gray-100">
                  <button
                    onClick={() => fetchEmails(true, emailsLastKey)}
                    disabled={loadingMoreEmails}
                    className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loadingMoreEmails ? 'Loading...' : 'Load more emails'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
