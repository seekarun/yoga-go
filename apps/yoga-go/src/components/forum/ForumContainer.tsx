'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useNotificationContextOptional } from '@/contexts/NotificationContext';
import type {
  ApiResponse,
  ForumAccessLevel,
  ForumContextType,
  ForumContextVisibility,
  ForumThreadWithReplies,
} from '@/types';
import { useCallback, useEffect, useState } from 'react';
import ForumPostForm from './ForumPostForm';
import ForumThreadItem from './ForumThreadItem';

interface ForumContainerProps {
  context: string;
  contextType: ForumContextType;
  contextVisibility: ForumContextVisibility;
  expertId: string;
  sourceTitle?: string;
  sourceUrl?: string;
  showContextBadge?: boolean;
  highlightThreadId?: string;
}

export default function ForumContainer({
  context,
  contextType,
  contextVisibility,
  expertId,
  sourceTitle,
  sourceUrl,
  showContextBadge = false,
  highlightThreadId,
}: ForumContainerProps) {
  const { user, isAuthenticated, isExpert } = useAuth();
  const notificationContext = useNotificationContextOptional();
  const [threads, setThreads] = useState<ForumThreadWithReplies[]>([]);
  const [accessLevel, setAccessLevel] = useState<ForumAccessLevel>('none');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert context string to URL path
  const contextPath = context.replace(/\./g, '/');

  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        expertId,
        contextVisibility,
      });

      const response = await fetch(`/data/forum/context/${contextPath}?${params}`);
      const data: ApiResponse<ForumThreadWithReplies[]> & { accessLevel?: ForumAccessLevel } =
        await response.json();

      if (data.success && data.data) {
        setThreads(data.data);
        setAccessLevel(data.accessLevel || 'none');
      } else {
        // If access denied, don't show error for private contexts
        if (response.status === 403) {
          setAccessLevel('none');
          setThreads([]);
        } else {
          setError(data.error || 'Failed to load discussions');
        }
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Fetch error:', err);
      setError('Failed to load discussions');
    } finally {
      setIsLoading(false);
    }
  }, [contextPath, expertId, contextVisibility]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleNewThread = async (content: string) => {
    try {
      const response = await fetch(`/data/forum/context/${contextPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          contextVisibility,
          expertId,
          contextType,
          sourceTitle,
          sourceUrl,
        }),
      });

      const data: ApiResponse<ForumThreadWithReplies> = await response.json();
      if (data.success && data.data) {
        setThreads(prev => [data.data as ForumThreadWithReplies, ...prev]);
      } else {
        console.error('[DBG][ForumContainer] Create error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Create error:', err);
    }
  };

  const handleReply = async (threadId: string, content: string) => {
    try {
      const response = await fetch(`/data/forum/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          expertId,
        }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (data.success) {
        await fetchThreads(); // Refresh to get updated reply counts
      } else {
        console.error('[DBG][ForumContainer] Reply error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Reply error:', err);
    }
  };

  const handleLike = async (messageId: string) => {
    try {
      const response = await fetch(`/data/forum/threads/${messageId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (!data.success) {
        console.error('[DBG][ForumContainer] Like error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Like error:', err);
    }
  };

  const handleUnlike = async (messageId: string) => {
    try {
      const response = await fetch(`/data/forum/threads/${messageId}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (!data.success) {
        console.error('[DBG][ForumContainer] Unlike error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Unlike error:', err);
    }
  };

  const handleEdit = async (messageId: string, content: string) => {
    try {
      const response = await fetch(`/data/forum/threads/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (data.success) {
        await fetchThreads();
      } else {
        console.error('[DBG][ForumContainer] Edit error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Edit error:', err);
    }
  };

  const handleDelete = async (messageId: string) => {
    try {
      const response = await fetch(`/data/forum/threads/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (data.success) {
        await fetchThreads();
      } else {
        console.error('[DBG][ForumContainer] Delete error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][ForumContainer] Delete error:', err);
    }
  };

  // Handle thread click - clear related notifications
  const handleThreadClick = (threadId: string) => {
    if (notificationContext) {
      const relatedNotifications = notificationContext.notifications.filter(n => {
        if (n.type !== 'forum_thread' && n.type !== 'forum_reply') return false;
        const metadata = n.metadata as { threadId?: string } | undefined;
        return metadata?.threadId === threadId;
      });
      for (const notification of relatedNotifications) {
        if (!notification.isRead) {
          notificationContext.markAsRead(notification.id);
        }
      }
    }
  };

  // Guest view for public contexts (view only)
  if (!isAuthenticated && contextVisibility === 'public') {
    return (
      <div style={{ padding: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Discussion</h3>

        {isLoading && (
          <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>Loading...</div>
        )}

        {!isLoading && threads.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '32px',
              opacity: 0.6,
              background: 'rgba(128,128,128,0.1)',
              borderRadius: '8px',
            }}
          >
            No discussions yet.
          </div>
        )}

        {!isLoading && threads.length > 0 && (
          <div>
            {threads.map(thread => (
              <ForumThreadItem
                key={thread.id}
                thread={thread}
                isExpert={false}
                accessLevel="view"
                showContextBadge={showContextBadge}
                onLike={async () => {}}
                onUnlike={async () => {}}
                onReply={async () => {}}
                onEdit={async () => {}}
                onDelete={async () => {}}
              />
            ))}
          </div>
        )}

        <div
          style={{
            marginTop: '16px',
            padding: '16px',
            background: 'rgba(128,128,128,0.1)',
            borderRadius: '8px',
            textAlign: 'center',
            opacity: 0.8,
          }}
        >
          <a href="/auth/signin" style={{ color: 'var(--brand-500, #ff6b35)' }}>
            Sign in
          </a>{' '}
          to join the discussion
        </div>
      </div>
    );
  }

  // No access for private contexts
  if (accessLevel === 'none') {
    if (contextVisibility === 'private') {
      return null; // Don't show anything for private contexts without access
    }
    return (
      <div style={{ padding: '24px', textAlign: 'center', opacity: 0.6 }}>
        You do not have access to this discussion.
      </div>
    );
  }

  const canParticipate = accessLevel === 'participate';
  const isExpertOwner = isExpert && user?.expertProfile === expertId;

  return (
    <div style={{ padding: '8px' }}>
      {/* New thread form */}
      {canParticipate && (
        <div style={{ marginBottom: '24px' }}>
          <ForumPostForm onSubmit={handleNewThread} placeholder="Start a discussion..." />
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '24px', opacity: 0.6 }}>
          Loading discussions...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(211,47,47,0.1)',
            border: '1px solid rgba(211,47,47,0.3)',
            borderRadius: '8px',
            color: '#ef5350',
          }}
        >
          {error}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && threads.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            opacity: 0.6,
            background: 'rgba(128,128,128,0.1)',
            borderRadius: '8px',
          }}
        >
          No discussions yet. Be the first to start one!
        </div>
      )}

      {/* Threads list */}
      {!isLoading && !error && threads.length > 0 && (
        <div>
          {threads.map(thread => (
            <ForumThreadItem
              key={thread.id}
              thread={thread}
              currentUserId={user?.id}
              isExpert={isExpertOwner}
              accessLevel={accessLevel}
              showContextBadge={showContextBadge}
              isHighlighted={thread.id === highlightThreadId}
              defaultExpanded={thread.id === highlightThreadId}
              onLike={handleLike}
              onUnlike={handleUnlike}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onThreadClick={handleThreadClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
