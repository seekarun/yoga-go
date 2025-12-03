'use client';

import { useState } from 'react';
import type { VoteType } from '@/types';

interface VoteButtonsProps {
  discussionId: string;
  initialUpvotes: number;
  initialDownvotes: number;
  userVote?: VoteType;
  onVote: (voteType: VoteType) => Promise<void>;
}

export default function VoteButtons({
  discussionId: _discussionId,
  initialUpvotes,
  initialDownvotes,
  userVote,
  onVote,
}: VoteButtonsProps) {
  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [currentVote, setCurrentVote] = useState<VoteType | undefined>(userVote);
  const [isVoting, setIsVoting] = useState(false);

  const netScore = upvotes - downvotes;

  const handleVote = async (voteType: VoteType) => {
    if (isVoting) return;

    setIsVoting(true);
    try {
      // Optimistic update
      const _oldVote = currentVote;
      const _oldUpvotes = upvotes;
      const _oldDownvotes = downvotes;

      if (currentVote === voteType) {
        // Removing vote
        setCurrentVote(undefined);
        if (voteType === 'up') {
          setUpvotes(upvotes - 1);
        } else {
          setDownvotes(downvotes - 1);
        }
      } else if (currentVote) {
        // Changing vote
        setCurrentVote(voteType);
        if (voteType === 'up') {
          setUpvotes(upvotes + 1);
          setDownvotes(downvotes - 1);
        } else {
          setUpvotes(upvotes - 1);
          setDownvotes(downvotes + 1);
        }
      } else {
        // New vote
        setCurrentVote(voteType);
        if (voteType === 'up') {
          setUpvotes(upvotes + 1);
        } else {
          setDownvotes(downvotes + 1);
        }
      }

      await onVote(voteType);
    } catch (error) {
      console.error('[DBG][VoteButtons] Vote failed:', error);
      // Revert on error - fetch fresh data would be better
      window.location.reload();
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '4px',
        marginRight: '12px',
      }}
    >
      {/* Upvote button */}
      <button
        onClick={() => handleVote('up')}
        disabled={isVoting}
        style={{
          background: 'none',
          border: 'none',
          cursor: isVoting ? 'not-allowed' : 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isVoting ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
        aria-label="Upvote"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={currentVote === 'up' ? '#ff6b35' : 'none'}
          stroke={currentVote === 'up' ? '#ff6b35' : '#666'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>

      {/* Score */}
      <span
        style={{
          fontSize: '14px',
          fontWeight: '600',
          color: netScore > 0 ? '#ff6b35' : netScore < 0 ? '#666' : '#888',
          minWidth: '24px',
          textAlign: 'center',
        }}
      >
        {netScore}
      </span>

      {/* Downvote button */}
      <button
        onClick={() => handleVote('down')}
        disabled={isVoting}
        style={{
          background: 'none',
          border: 'none',
          cursor: isVoting ? 'not-allowed' : 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isVoting ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
        aria-label="Downvote"
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill={currentVote === 'down' ? '#4169e1' : 'none'}
          stroke={currentVote === 'down' ? '#4169e1' : '#666'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
