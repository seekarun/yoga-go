'use client';

import { useState } from 'react';
import VoteButtons from './VoteButtons';
import DiscussionForm from './DiscussionForm';
import ModerationMenu from './ModerationMenu';
import type { DiscussionThread, VoteType } from '@/types';

interface DiscussionPostProps {
  discussion: DiscussionThread;
  currentUserId: string;
  currentUserRole: 'learner' | 'expert';
  isExpertForCourse: boolean;
  onVote: (discussionId: string, voteType: VoteType) => Promise<void>;
  onReply: (parentId: string, content: string) => Promise<void>;
  onEdit: (discussionId: string, content: string) => Promise<void>;
  onDelete: (discussionId: string) => Promise<void>;
  onModerate: (discussionId: string, action: string) => Promise<void>;
  depth?: number;
}

export default function DiscussionPost({
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
}: DiscussionPostProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(discussion.content);
  const [isSaving, setIsSaving] = useState(false);

  const isOwnPost = discussion.userId === currentUserId;
  const isExpert = discussion.userRole === 'expert';

  const handleVote = async (voteType: VoteType) => {
    await onVote(discussion.id, voteType);
  };

  const handleReply = async (content: string) => {
    await onReply(discussion.id, content);
    setIsReplying(false);
  };

  const handleEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onEdit(discussion.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('[DBG][DiscussionPost] Edit failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    await onDelete(discussion.id);
  };

  const handleModerate = async (action: string) => {
    await onModerate(discussion.id, action);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      style={{
        marginLeft: depth > 0 ? '24px' : '0',
        borderLeft: depth > 0 ? '2px solid #e0e0e0' : 'none',
        paddingLeft: depth > 0 ? '16px' : '0',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '12px',
          padding: '16px',
          background: discussion.isPinned ? '#fff8f0' : '#fff',
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          marginBottom: '12px',
        }}
      >
        {/* Vote buttons */}
        <VoteButtons
          discussionId={discussion.id}
          initialUpvotes={discussion.upvotes}
          initialDownvotes={discussion.downvotes}
          userVote={discussion.userVote}
          onVote={handleVote}
        />

        {/* Content */}
        <div style={{ flex: 1 }}>
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            {discussion.userAvatar && (
              <img
                src={discussion.userAvatar}
                alt={discussion.userName}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                }}
              />
            )}
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{discussion.userName}</span>

            {isExpert && (
              <span
                style={{
                  padding: '2px 8px',
                  background: '#ff6b35',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  borderRadius: '4px',
                }}
              >
                EXPERT
              </span>
            )}

            {discussion.isPinned && (
              <span
                style={{
                  padding: '2px 8px',
                  background: '#ffa726',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  borderRadius: '4px',
                }}
              >
                PINNED
              </span>
            )}

            {discussion.isResolved && (
              <span
                style={{
                  padding: '2px 8px',
                  background: '#4caf50',
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '600',
                  borderRadius: '4px',
                }}
              >
                ✓ RESOLVED
              </span>
            )}

            <span style={{ color: '#888', fontSize: '12px' }}>
              {formatDate(discussion.createdAt)}
            </span>

            {discussion.editedAt && (
              <span style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>(edited)</span>
            )}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
              {isExpertForCourse && (
                <ModerationMenu
                  discussion={discussion}
                  onModerate={handleModerate}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </div>

          {/* Content */}
          {isEditing ? (
            <div style={{ marginBottom: '12px' }}>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  outline: 'none',
                  marginBottom: '8px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleEdit}
                  disabled={!editContent.trim() || isSaving}
                  style={{
                    padding: '6px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    background: !editContent.trim() || isSaving ? '#ccc' : '#ff6b35',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: !editContent.trim() || isSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(discussion.content);
                  }}
                  disabled={isSaving}
                  style={{
                    padding: '6px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '6px',
                    background: '#fff',
                    color: '#666',
                    fontSize: '13px',
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                color: '#333',
                marginBottom: '12px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {discussion.content}
            </p>
          )}

          {/* Actions */}
          {!isEditing && (
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
              <button
                onClick={() => setIsReplying(!isReplying)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '0',
                  fontWeight: '600',
                }}
              >
                Reply
              </button>

              {isOwnPost && (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#666',
                      cursor: 'pointer',
                      padding: '0',
                      fontWeight: '600',
                    }}
                  >
                    Edit
                  </button>
                  {!isExpertForCourse && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this post?')) {
                          handleDelete();
                        }
                      }}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#d32f2f',
                        cursor: 'pointer',
                        padding: '0',
                        fontWeight: '600',
                      }}
                    >
                      Delete
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Reply form */}
          {isReplying && (
            <div style={{ marginTop: '12px' }}>
              <DiscussionForm
                onSubmit={handleReply}
                onCancel={() => setIsReplying(false)}
                placeholder="Write a reply..."
                submitLabel="Reply"
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
