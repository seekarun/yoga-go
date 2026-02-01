'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface BlogLikeButtonProps {
  postId: string;
  initialLikeCount: number;
}

export default function BlogLikeButton({ postId, initialLikeCount }: BlogLikeButtonProps) {
  const { isAuthenticated, login } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check initial like status
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!isAuthenticated) {
        setIsChecking(false);
        return;
      }

      try {
        const response = await fetch(`/data/app/blog/${postId}/like`, {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setLiked(data.data.liked);
            setLikeCount(data.data.likeCount);
          }
        }
      } catch (error) {
        console.error('[DBG][BlogLikeButton] Error checking like status:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkLikeStatus();
  }, [postId, isAuthenticated]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      login(window.location.pathname);
      return;
    }

    if (isLoading) return;

    // Optimistic update
    const previousLiked = liked;
    const previousCount = likeCount;
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
    setIsLoading(true);

    try {
      const response = await fetch(`/data/app/blog/${postId}/like`, {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to toggle like');
      }

      const data = await response.json();
      if (data.success) {
        setLiked(data.data.liked);
        setLikeCount(data.data.likeCount);
      } else {
        throw new Error(data.error || 'Failed to toggle like');
      }
    } catch (error) {
      // Revert optimistic update
      setLiked(previousLiked);
      setLikeCount(previousCount);
      console.error('[DBG][BlogLikeButton] Error toggling like:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading || isChecking}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        liked
          ? 'bg-red-50 text-red-500 hover:bg-red-100'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } ${isLoading || isChecking ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isAuthenticated ? (liked ? 'Unlike' : 'Like') : 'Login to like'}
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`transition-transform ${liked ? 'scale-110' : ''}`}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="font-medium">{likeCount}</span>
    </button>
  );
}
