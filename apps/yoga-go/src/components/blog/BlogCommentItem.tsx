'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { BlogComment } from '@/types';

interface BlogCommentItemProps {
  comment: BlogComment;
  postId: string;
  expertId: string;
  onCommentUpdated: () => void;
  onCommentDeleted: () => void;
}

export default function BlogCommentItem({
  comment,
  postId,
  expertId,
  onCommentUpdated,
  onCommentDeleted,
}: BlogCommentItemProps) {
  const { user, isAuthenticated } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isCommentAuthor = isAuthenticated && user?.id === comment.userId;
  const isPostExpert = isAuthenticated && user?.expertProfile === expertId;
  const canEdit = isCommentAuthor;
  const canDelete = isCommentAuthor || isPostExpert;

  const formattedDate = new Date(comment.createdAt || '').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handleEdit = async () => {
    if (!editContent.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/data/app/blog/comments/${comment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          postId,
          content: editContent.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update comment');
      }

      if (data.success) {
        setIsEditing(false);
        onCommentUpdated();
      } else {
        throw new Error(data.error || 'Failed to update comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/data/app/blog/comments/${comment.id}?postId=${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete comment');
      }

      if (data.success) {
        onCommentDeleted();
      } else {
        throw new Error(data.error || 'Failed to delete comment');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditContent(comment.content);
    setError('');
  };

  return (
    <div className="flex gap-4 py-4">
      {/* User avatar */}
      <div className="flex-shrink-0">
        {comment.userAvatar ? (
          <img
            src={comment.userAvatar}
            alt={comment.userName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-medium">
            {comment.userName.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Comment content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-gray-900">{comment.userName}</span>
          <span className="text-gray-400 text-sm">•</span>
          <span className="text-gray-500 text-sm">{formattedDate}</span>
          {comment.editedAt && <span className="text-gray-400 text-xs">(edited)</span>}
        </div>

        {isEditing ? (
          <div className="space-y-3">
            <textarea
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="flex gap-2">
              <button
                onClick={handleEdit}
                disabled={isSubmitting}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="px-4 py-1.5 text-gray-600 text-sm rounded hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            {(canEdit || canDelete) && (
              <div className="flex gap-3 mt-2">
                {canEdit && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-gray-500 text-sm hover:text-gray-700"
                  >
                    Edit
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isSubmitting}
                    className="text-red-500 text-sm hover:text-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
