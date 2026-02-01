'use client';

import { useState, useEffect } from 'react';
import BlogCommentItem from './BlogCommentItem';
import BlogCommentForm from './BlogCommentForm';
import type { BlogComment } from '@/types';

interface BlogCommentListProps {
  postId: string;
  expertId: string;
}

export default function BlogCommentList({ postId, expertId }: BlogCommentListProps) {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const response = await fetch(`/data/experts/${expertId}/blog/${postId}/comments`);
        const data = await response.json();

        if (data.success) {
          setComments(data.data || []);
        } else {
          throw new Error(data.error || 'Failed to load comments');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load comments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComments();
  }, [postId, expertId]);

  const refetchComments = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/data/experts/${expertId}/blog/${postId}/comments`);
      const data = await response.json();

      if (data.success) {
        setComments(data.data || []);
      } else {
        throw new Error(data.error || 'Failed to load comments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommentAdded = () => {
    refetchComments();
  };

  const handleCommentUpdated = () => {
    refetchComments();
  };

  const handleCommentDeleted = () => {
    refetchComments();
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Comments</h3>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">Comments</h3>
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          <p>{error}</p>
          <button onClick={refetchComments} className="mt-2 text-sm underline hover:no-underline">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {/* Comment form */}
      <BlogCommentForm postId={postId} onCommentAdded={handleCommentAdded} />

      {/* Comments list */}
      {comments.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {comments.map(comment => (
            <BlogCommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              expertId={expertId}
              onCommentUpdated={handleCommentUpdated}
              onCommentDeleted={handleCommentDeleted}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</p>
      )}
    </div>
  );
}
