'use client';

import { useState } from 'react';
import type { VoteType } from '@/types';

interface ForumVoteButtonsProps {
  threadId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  userVote?: VoteType;
  onVote: (threadId: string, voteType: VoteType | null) => Promise<void>;
  disabled?: boolean;
}

export default function ForumVoteButtons({
  threadId,
  initialUpvotes,
  initialDownvotes,
  userVote,
  onVote,
  disabled = false,
}: ForumVoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<VoteType | undefined>(userVote);
  const [isVoting, setIsVoting] = useState(false);

  const handleVote = async (voteType: VoteType) => {
    if (isVoting || disabled) return;

    setIsVoting(true);

    // Optimistic update
    const previousVote = currentVote;
    const previousUpvotes = upvotes;
    const previousDownvotes = downvotes;

    if (currentVote === voteType) {
      // Removing vote
      setCurrentVote(undefined);
      if (voteType === 'up') setUpvotes(v => v - 1);
      if (voteType === 'down') setDownvotes(v => v - 1);
    } else {
      // Adding or changing vote
      if (currentVote === 'up') setUpvotes(v => v - 1);
      if (currentVote === 'down') setDownvotes(v => v - 1);
      setCurrentVote(voteType);
      if (voteType === 'up') setUpvotes(v => v + 1);
      if (voteType === 'down') setDownvotes(v => v + 1);
    }

    try {
      const newVote = currentVote === voteType ? null : voteType;
      await onVote(threadId, newVote);
    } catch {
      // Revert on error
      setCurrentVote(previousVote);
      setUpvotes(previousUpvotes);
      setDownvotes(previousDownvotes);
    } finally {
      setIsVoting(false);
    }
  };

  const netScore = upvotes - downvotes;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        minWidth: '40px',
      }}
    >
      <button
        onClick={() => handleVote('up')}
        disabled={isVoting || disabled}
        style={{
          background: 'none',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '4px',
          borderRadius: '4px',
          color: currentVote === 'up' ? 'var(--brand-500, #ff6b35)' : 'inherit',
          opacity: disabled ? 0.5 : currentVote === 'up' ? 1 : 0.5,
        }}
        title="Upvote"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 4l-8 8h5v8h6v-8h5z" />
        </svg>
      </button>

      <span
        style={{
          fontWeight: '600',
          fontSize: '14px',
          color: netScore > 0 ? 'var(--brand-500, #ff6b35)' : 'inherit',
          opacity: netScore === 0 ? 0.6 : 1,
        }}
      >
        {netScore}
      </span>

      <button
        onClick={() => handleVote('down')}
        disabled={isVoting || disabled}
        style={{
          background: 'none',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          padding: '4px',
          borderRadius: '4px',
          color: currentVote === 'down' ? '#d32f2f' : 'inherit',
          opacity: disabled ? 0.5 : currentVote === 'down' ? 1 : 0.5,
        }}
        title="Downvote"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 20l8-8h-5v-8h-6v8h-5z" />
        </svg>
      </button>
    </div>
  );
}
