'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { ForumThreadItem } from '@/components/forum';
import type { ForumThreadWithReplies, ApiResponse } from '@/types';

export default function CommunityPage() {
  const { user, isAuthenticated } = useAuth();
  const [threads, setThreads] = useState<ForumThreadWithReplies[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async () => {
    // Community page currently shows threads from all public contexts
    // For now, showing placeholder - users can find discussions on expert pages
    setIsLoading(false);
    setThreads([]);
  };

  useEffect(() => {
    fetchThreads();
  }, []);

  const handleLike = async (messageId: string) => {
    if (!isAuthenticated) return;

    // Find the thread containing this message to get expertId
    const thread = threads.find(
      t => t.id === messageId || t.replies?.some(r => r.id === messageId)
    );
    if (!thread) return;

    try {
      const response = await fetch(`/data/forum/threads/${messageId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId: thread.expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (!data.success) {
        console.error('[DBG][CommunityPage] Like error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][CommunityPage] Like error:', err);
    }
  };

  const handleUnlike = async (messageId: string) => {
    if (!isAuthenticated) return;

    const thread = threads.find(
      t => t.id === messageId || t.replies?.some(r => r.id === messageId)
    );
    if (!thread) return;

    try {
      const response = await fetch(`/data/forum/threads/${messageId}/like`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId: thread.expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (!data.success) {
        console.error('[DBG][CommunityPage] Unlike error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][CommunityPage] Unlike error:', err);
    }
  };

  const handleReply = async (threadId: string, content: string) => {
    if (!isAuthenticated) return;

    try {
      const thread = threads.find(t => t.id === threadId);
      if (!thread) return;

      const response = await fetch(`/data/forum/threads/${threadId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          expertId: thread.expertId,
        }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (data.success) {
        await fetchThreads();
      } else {
        console.error('[DBG][CommunityPage] Reply error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][CommunityPage] Reply error:', err);
    }
  };

  const handleEdit = async (messageId: string, content: string) => {
    const thread = threads.find(
      t => t.id === messageId || t.replies?.some(r => r.id === messageId)
    );
    if (!thread) return;

    try {
      const response = await fetch(`/data/forum/threads/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, expertId: thread.expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (data.success) {
        await fetchThreads();
      } else {
        console.error('[DBG][CommunityPage] Edit error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][CommunityPage] Edit error:', err);
    }
  };

  const handleDelete = async (messageId: string) => {
    const thread = threads.find(
      t => t.id === messageId || t.replies?.some(r => r.id === messageId)
    );
    if (!thread) return;

    try {
      const response = await fetch(`/data/forum/threads/${messageId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId: thread.expertId }),
      });

      const data: ApiResponse<unknown> = await response.json();
      if (data.success) {
        await fetchThreads();
      } else {
        console.error('[DBG][CommunityPage] Delete error:', data.error);
      }
    } catch (err) {
      console.error('[DBG][CommunityPage] Delete error:', err);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
        paddingTop: '64px',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px 20px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#fff',
              marginBottom: '8px',
            }}
          >
            Community
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
            Join the conversation and connect with others
          </p>
        </div>

        {/* Sign in prompt for guests */}
        {!isAuthenticated && (
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.7)', marginBottom: '12px' }}>
              Sign in to join the discussion
            </p>
            <Link
              href="/auth/signin"
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: 'var(--brand-500, #ff6b35)',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
              }}
            >
              Sign In
            </Link>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
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
              marginBottom: '24px',
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
              padding: '64px 24px',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <p style={{ fontSize: '18px', marginBottom: '8px' }}>No discussions yet</p>
            <p style={{ fontSize: '14px' }}>
              Be the first to start a conversation on a blog post or course!
            </p>
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
                isExpert={false}
                accessLevel={isAuthenticated ? 'participate' : 'view'}
                showContextBadge={true}
                onLike={handleLike}
                onUnlike={handleUnlike}
                onReply={handleReply}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
