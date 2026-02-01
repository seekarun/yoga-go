'use client';

import { useState } from 'react';

interface ForumLikeButtonProps {
  likeCount: number;
  userLiked: boolean;
  onLike: () => Promise<void>;
  onUnlike: () => Promise<void>;
  small?: boolean;
}

export default function ForumLikeButton({
  likeCount,
  userLiked,
  onLike,
  onUnlike,
  small = false,
}: ForumLikeButtonProps) {
  const [isLiked, setIsLiked] = useState(userLiked);
  const [count, setCount] = useState(likeCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (isLoading) return;

    setIsLoading(true);
    const wasLiked = isLiked;

    // Optimistic update
    setIsLiked(!wasLiked);
    setCount(prev => (wasLiked ? prev - 1 : prev + 1));

    try {
      if (wasLiked) {
        await onUnlike();
      } else {
        await onLike();
      }
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setCount(prev => (wasLiked ? prev + 1 : prev - 1));
      console.error('[DBG][ForumLikeButton] Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const iconSize = small ? 14 : 18;
  const fontSize = small ? '12px' : '13px';

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        background: 'none',
        border: 'none',
        cursor: isLoading ? 'not-allowed' : 'pointer',
        padding: '2px 6px',
        borderRadius: '4px',
        color: isLiked ? 'var(--brand-500, #ff6b35)' : 'inherit',
        opacity: isLoading ? 0.5 : 1,
        transition: 'color 0.15s ease',
      }}
      title={isLiked ? 'Unlike' : 'Like'}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 24 24"
        fill={isLiked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span style={{ fontSize, fontWeight: isLiked ? '600' : '400' }}>
        {count > 0 ? count : ''}
      </span>
    </button>
  );
}
