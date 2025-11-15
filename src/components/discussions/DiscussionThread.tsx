'use client';

import { useState, useEffect } from 'react';
import DiscussionForm from './DiscussionForm';
import DiscussionReply from './DiscussionReply';
import { useAuth } from '@/contexts/AuthContext';
import type { DiscussionThread, VoteType, ApiResponse } from '@/types';

interface DiscussionThreadProps {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
  instructorId: string;
}

export default function DiscussionThread({
  courseId,
  lessonId,
  lessonTitle,
  instructorId,
}: DiscussionThreadProps) {
  const { user, isAuthenticated } = useAuth();
  const [discussions, setDiscussions] = useState<DiscussionThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isExpertForCourse = user?.role === 'expert' && user?.expertProfile === instructorId;

  const fetchDiscussions = async () => {
    try {
      const response = await fetch(`/data/app/courses/${courseId}/lessons/${lessonId}/discussions`);
      const data: ApiResponse<DiscussionThread[]> = await response.json();

      if (data.success && data.data) {
        setDiscussions(data.data);
      } else {
        setError(data.error || 'Failed to load discussions');
      }
    } catch (err) {
      console.error('[DBG][DiscussionThread] Fetch error:', err);
      setError('Failed to load discussions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchDiscussions();
    }
  }, [courseId, lessonId, isAuthenticated]);

  const handleNewDiscussion = async (content: string) => {
    try {
      const response = await fetch(
        `/data/app/courses/${courseId}/lessons/${lessonId}/discussions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        }
      );

      const data: ApiResponse<any> = await response.json();
      if (data.success) {
        await fetchDiscussions(); // Refresh discussions
      } else {
        alert(data.error || 'Failed to create discussion');
      }
    } catch (err) {
      console.error('[DBG][DiscussionThread] Create error:', err);
      alert('Failed to create discussion');
    }
  };

  const handleReply = async (parentId: string, content: string) => {
    try {
      const response = await fetch(
        `/data/app/courses/${courseId}/lessons/${lessonId}/discussions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, parentId }),
        }
      );

      const data: ApiResponse<any> = await response.json();
      if (data.success) {
        await fetchDiscussions(); // Refresh discussions
      } else {
        alert(data.error || 'Failed to post reply');
      }
    } catch (err) {
      console.error('[DBG][DiscussionThread] Reply error:', err);
      alert('Failed to post reply');
    }
  };

  const handleVote = async (discussionId: string, voteType: VoteType) => {
    try {
      const response = await fetch(`/data/app/discussions/${discussionId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      });

      const data: ApiResponse<any> = await response.json();
      if (!data.success) {
        alert(data.error || 'Failed to vote');
      }
      // Vote updates are optimistic in VoteButtons component
    } catch (err) {
      console.error('[DBG][DiscussionThread] Vote error:', err);
      throw err; // Let VoteButtons handle the error
    }
  };

  const handleEdit = async (discussionId: string, content: string) => {
    try {
      const response = await fetch(`/data/app/discussions/${discussionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });

      const data: ApiResponse<any> = await response.json();
      if (data.success) {
        await fetchDiscussions(); // Refresh discussions
      } else {
        alert(data.error || 'Failed to edit discussion');
      }
    } catch (err) {
      console.error('[DBG][DiscussionThread] Edit error:', err);
      alert('Failed to edit discussion');
    }
  };

  const handleDelete = async (discussionId: string) => {
    try {
      const response = await fetch(`/data/app/discussions/${discussionId}`, {
        method: 'DELETE',
      });

      const data: ApiResponse<any> = await response.json();
      if (data.success) {
        await fetchDiscussions(); // Refresh discussions
      } else {
        alert(data.error || 'Failed to delete discussion');
      }
    } catch (err) {
      console.error('[DBG][DiscussionThread] Delete error:', err);
      alert('Failed to delete discussion');
    }
  };

  const handleModerate = async (discussionId: string, action: string) => {
    try {
      const response = await fetch(`/data/app/discussions/${discussionId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data: ApiResponse<any> = await response.json();
      if (data.success) {
        await fetchDiscussions(); // Refresh discussions
      } else {
        alert(data.error || 'Failed to moderate discussion');
      }
    } catch (err) {
      console.error('[DBG][DiscussionThread] Moderate error:', err);
      alert('Failed to moderate discussion');
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div
        style={{
          padding: '24px',
          textAlign: 'center',
          color: '#666',
          background: '#f9f9f9',
          borderRadius: '8px',
        }}
      >
        Please log in to view and participate in discussions.
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', paddingBottom: '60px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
          Discussion for {lessonTitle}
        </h2>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Share your thoughts, ask questions, and connect with other learners
        </p>
      </div>

      {/* New discussion form */}
      <div style={{ marginBottom: '32px' }}>
        <DiscussionForm onSubmit={handleNewDiscussion} placeholder="Start a new discussion..." />
      </div>

      {/* Loading state */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
          Loading discussions...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            padding: '16px',
            background: '#fff3f3',
            border: '1px solid #ffcdd2',
            borderRadius: '8px',
            color: '#d32f2f',
          }}
        >
          {error}
        </div>
      )}

      {/* Discussions list */}
      {!isLoading && !error && discussions.length === 0 && (
        <div
          style={{
            padding: '48px',
            textAlign: 'center',
            color: '#888',
            background: '#f9f9f9',
            borderRadius: '8px',
          }}
        >
          No discussions yet. Be the first to start one!
        </div>
      )}

      {!isLoading && !error && discussions.length > 0 && (
        <div>
          {discussions.map(discussion => (
            <DiscussionReply
              key={discussion.id}
              discussion={discussion}
              currentUserId={user.id}
              currentUserRole={user.role}
              isExpertForCourse={isExpertForCourse}
              onVote={handleVote}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onModerate={handleModerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
