'use client';

import { useState } from 'react';
import DiscussionPost from './DiscussionPost';
import type { DiscussionThread, VoteType, UserRole } from '@/types';

interface DiscussionReplyProps {
  discussion: DiscussionThread;
  currentUserId: string;
  currentUserRole: UserRole;
  isExpertForCourse: boolean;
  onVote: (discussionId: string, voteType: VoteType) => Promise<void>;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (discussionId: string, content: string) => Promise<void>;
  onDelete: (discussionId: string) => Promise<void>;
  onModerate: (discussionId: string, action: string) => Promise<void>;
  depth?: number;
  maxDepth?: number;
}

export default function DiscussionReply({
  discussion,
  currentUserId,
  currentUserRole,
  isExpertForCourse,
  onVote,
  onReply,
  onEdit,
  onDelete,
  onModerate,
  depth = 0,
  maxDepth = 10,
}: DiscussionReplyProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showContinueThread, setShowContinueThread] = useState(depth >= 5);

  const hasReplies = discussion.replies && discussion.replies.length > 0;

  return (
    <div>
      {/* Main discussion post */}
      <DiscussionPost
        discussion={discussion}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        isExpertForCourse={isExpertForCourse}
        onVote={onVote}
        onReply={onReply}
        onEdit={onEdit}
        onDelete={onDelete}
        onModerate={onModerate}
        depth={depth}
      />

      {/* Replies */}
      {hasReplies && !isCollapsed && (
        <div>
          {showContinueThread && depth >= 5 ? (
            <div style={{ marginLeft: depth > 0 ? '40px' : '0' }}>
              <button
                onClick={() => setShowContinueThread(false)}
                style={{
                  background: 'none',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  color: '#666',
                  cursor: 'pointer',
                  marginBottom: '12px',
                }}
              >
                Continue thread ({discussion.replies.length}{' '}
                {discussion.replies.length === 1 ? 'reply' : 'replies'})
              </button>
            </div>
          ) : (
            discussion.replies.map(reply => (
              <DiscussionReply
                key={reply.id}
                discussion={reply}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                isExpertForCourse={isExpertForCourse}
                onVote={onVote}
                onReply={onReply}
                onEdit={onEdit}
                onDelete={onDelete}
                onModerate={onModerate}
                depth={depth + 1}
                maxDepth={maxDepth}
              />
            ))
          )}
        </div>
      )}

      {/* Collapse/Expand button for threads with many replies */}
      {hasReplies && depth < 5 && (
        <div style={{ marginLeft: depth > 0 ? '40px' : '0', marginBottom: '12px' }}>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            style={{
              background: 'none',
              border: 'none',
              padding: '0',
              fontSize: '13px',
              color: '#666',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            {isCollapsed
              ? `+ Show ${discussion.replies.length} ${discussion.replies.length === 1 ? 'reply' : 'replies'}`
              : `− Collapse thread`}
          </button>
        </div>
      )}
    </div>
  );
}
