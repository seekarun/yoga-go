'use client';

import { useState } from 'react';
import ForumPostForm from './ForumPostForm';
import ForumModeration from './ForumModeration';
import ForumLikeButton from './ForumLikeButton';
import ForumContextBadge from './ForumContextBadge';
import type { ForumThreadWithReplies, ForumReply, ForumAccessLevel } from '@/types';

interface ForumThreadItemProps {
  thread: ForumThreadWithReplies;
  currentUserId?: string;
  isExpert: boolean;
  accessLevel: ForumAccessLevel;
  showContextBadge?: boolean;
  isHighlighted?: boolean;
  defaultExpanded?: boolean;
  onLike: (messageId: string) => Promise<void>;
  onUnlike: (messageId: string) => Promise<void>;
  onReply: (threadId: string, content: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  onThreadClick?: (threadId: string) => void;
}

export default function ForumThreadItem({
  thread,
  currentUserId,
  isExpert,
  accessLevel,
  showContextBadge = false,
  isHighlighted = false,
  defaultExpanded = false,
  onLike,
  onUnlike,
  onReply,
  onEdit,
  onDelete,
  onThreadClick,
}: ForumThreadItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(thread.content);
  const [isSaving, setIsSaving] = useState(false);
  const [showReplies, setShowReplies] = useState(defaultExpanded);
  const [wasClicked, setWasClicked] = useState(false);

  const isOwnPost = thread.userId === currentUserId;
  const isExpertPost = thread.userRole === 'expert';
  const canParticipate = accessLevel === 'participate';
  const hasReplies = thread.replies && thread.replies.length > 0;

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

  const handleReply = async (content: string) => {
    await onReply(thread.id, content);
    setIsReplying(false);
  };

  const handleEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onEdit(thread.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('[DBG][ForumThreadItem] Edit failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const shouldHighlight = isHighlighted && !wasClicked;

  const handleThreadClick = () => {
    if (shouldHighlight && onThreadClick) {
      setWasClicked(true);
      onThreadClick(thread.id);
    }
    // Expand replies when clicking
    if (!showReplies && hasReplies) {
      setShowReplies(true);
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Main Thread */}
      <div
        onClick={handleThreadClick}
        style={{
          padding: '16px',
          background: shouldHighlight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(128,128,128,0.08)',
          border: shouldHighlight
            ? '2px solid var(--color-primary, #3b82f6)'
            : '1px solid rgba(128,128,128,0.2)',
          borderRadius: '8px',
          cursor: shouldHighlight ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
      >
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
          {thread.userAvatar && (
            <img
              src={thread.userAvatar}
              alt={thread.userName}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
              }}
            />
          )}
          <span style={{ fontWeight: '600', fontSize: '14px' }}>{thread.userName}</span>

          {isExpertPost && (
            <span
              style={{
                padding: '2px 8px',
                background: 'var(--brand-500, #ff6b35)',
                color: '#fff',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '4px',
              }}
            >
              EXPERT
            </span>
          )}

          <span style={{ opacity: 0.5, fontSize: '12px' }}>{formatDate(thread.createdAt)}</span>

          {thread.editedAt && (
            <span style={{ opacity: 0.4, fontSize: '12px', fontStyle: 'italic' }}>(edited)</span>
          )}

          {showContextBadge && (
            <ForumContextBadge
              contextType={thread.contextType}
              sourceTitle={thread.sourceTitle}
              sourceUrl={thread.sourceUrl}
            />
          )}

          {/* Moderation menu for experts */}
          {isExpert && (
            <div style={{ marginLeft: 'auto' }}>
              <ForumModeration messageId={thread.id} onDelete={onDelete} />
            </div>
          )}
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
                border: '1px solid rgba(128,128,128,0.3)',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                marginBottom: '8px',
                background: 'rgba(128,128,128,0.1)',
                color: 'inherit',
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
                  background:
                    !editContent.trim() || isSaving ? '#999' : 'var(--brand-500, #ff6b35)',
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
                  setEditContent(thread.content);
                }}
                disabled={isSaving}
                style={{
                  padding: '6px 16px',
                  border: '1px solid rgba(128,128,128,0.3)',
                  borderRadius: '6px',
                  background: 'transparent',
                  color: 'inherit',
                  opacity: 0.7,
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
              marginBottom: '12px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {thread.content}
          </p>
        )}

        {/* Actions */}
        {!isEditing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
            {canParticipate && (
              <ForumLikeButton
                likeCount={thread.likeCount}
                userLiked={thread.userLiked}
                onLike={() => onLike(thread.id)}
                onUnlike={() => onUnlike(thread.id)}
              />
            )}

            {canParticipate && (
              <button
                onClick={() => setIsReplying(!isReplying)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-500, #ff6b35)',
                  cursor: 'pointer',
                  padding: '0',
                  fontWeight: '600',
                }}
              >
                Reply
              </button>
            )}

            {isOwnPost && canParticipate && (
              <button
                onClick={() => setIsEditing(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-500, #ff6b35)',
                  cursor: 'pointer',
                  padding: '0',
                  fontWeight: '600',
                }}
              >
                Edit
              </button>
            )}

            {hasReplies && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#666',
                  cursor: 'pointer',
                  padding: '0',
                }}
              >
                {showReplies ? 'Hide' : 'Show'} {thread.replyCount}{' '}
                {thread.replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
        )}

        {/* Reply form */}
        {isReplying && canParticipate && (
          <div style={{ marginTop: '12px' }}>
            <ForumPostForm
              onSubmit={handleReply}
              onCancel={() => setIsReplying(false)}
              placeholder="Write a reply..."
              submitLabel="Reply"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Replies (flat, Slack-like) */}
      {hasReplies && showReplies && (
        <div style={{ marginLeft: '24px', marginTop: '8px' }}>
          {thread.replies.map(reply => (
            <ReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUserId}
              isExpert={isExpert}
              canParticipate={canParticipate}
              onLike={onLike}
              onUnlike={onUnlike}
              onEdit={onEdit}
              onDelete={onDelete}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Reply item component (flat, no nesting)
interface ReplyItemProps {
  reply: ForumReply & { userLiked?: boolean };
  currentUserId?: string;
  isExpert: boolean;
  canParticipate: boolean;
  onLike: (messageId: string) => Promise<void>;
  onUnlike: (messageId: string) => Promise<void>;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
  formatDate: (dateStr?: string) => string;
}

function ReplyItem({
  reply,
  currentUserId,
  isExpert,
  canParticipate,
  onLike,
  onUnlike,
  onEdit,
  onDelete,
  formatDate,
}: ReplyItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(reply.content);
  const [isSaving, setIsSaving] = useState(false);

  const isOwnPost = reply.userId === currentUserId;
  const isExpertPost = reply.userRole === 'expert';

  const handleEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onEdit(reply.id, editContent.trim());
      setIsEditing(false);
    } catch (error) {
      console.error('[DBG][ReplyItem] Edit failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        padding: '12px',
        background: 'rgba(128,128,128,0.05)',
        border: '1px solid rgba(128,128,128,0.15)',
        borderRadius: '6px',
        marginBottom: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '6px',
        }}
      >
        {reply.userAvatar && (
          <img
            src={reply.userAvatar}
            alt={reply.userName}
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '50%',
            }}
          />
        )}
        <span style={{ fontWeight: '600', fontSize: '13px' }}>{reply.userName}</span>

        {isExpertPost && (
          <span
            style={{
              padding: '1px 6px',
              background: 'var(--brand-500, #ff6b35)',
              color: '#fff',
              fontSize: '10px',
              fontWeight: '600',
              borderRadius: '3px',
            }}
          >
            EXPERT
          </span>
        )}

        <span style={{ opacity: 0.5, fontSize: '11px' }}>{formatDate(reply.createdAt)}</span>

        {reply.editedAt && (
          <span style={{ opacity: 0.4, fontSize: '11px', fontStyle: 'italic' }}>(edited)</span>
        )}

        {isExpert && (
          <div style={{ marginLeft: 'auto' }}>
            <ForumModeration messageId={reply.id} onDelete={onDelete} />
          </div>
        )}
      </div>

      {/* Content */}
      {isEditing ? (
        <div>
          <textarea
            value={editContent}
            onChange={e => setEditContent(e.target.value)}
            disabled={isSaving}
            style={{
              width: '100%',
              minHeight: '60px',
              padding: '8px',
              border: '1px solid rgba(128,128,128,0.3)',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              outline: 'none',
              marginBottom: '8px',
              background: 'rgba(128,128,128,0.1)',
              color: 'inherit',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleEdit}
              disabled={!editContent.trim() || isSaving}
              style={{
                padding: '4px 12px',
                border: 'none',
                borderRadius: '4px',
                background: !editContent.trim() || isSaving ? '#999' : 'var(--brand-500, #ff6b35)',
                color: '#fff',
                fontSize: '12px',
                cursor: !editContent.trim() || isSaving ? 'not-allowed' : 'pointer',
              }}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditContent(reply.content);
              }}
              disabled={isSaving}
              style={{
                padding: '4px 12px',
                border: '1px solid rgba(128,128,128,0.3)',
                borderRadius: '4px',
                background: 'transparent',
                color: 'inherit',
                opacity: 0.7,
                fontSize: '12px',
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
            fontSize: '13px',
            lineHeight: '1.5',
            marginBottom: '8px',
            whiteSpace: 'pre-wrap',
          }}
        >
          {reply.content}
        </p>
      )}

      {/* Actions */}
      {!isEditing && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px' }}>
          {canParticipate && (
            <ForumLikeButton
              likeCount={reply.likeCount}
              userLiked={reply.userLiked || false}
              onLike={() => onLike(reply.id)}
              onUnlike={() => onUnlike(reply.id)}
              small
            />
          )}

          {isOwnPost && canParticipate && (
            <button
              onClick={() => setIsEditing(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--brand-500, #ff6b35)',
                cursor: 'pointer',
                padding: '0',
                fontWeight: '600',
              }}
            >
              Edit
            </button>
          )}
        </div>
      )}
    </div>
  );
}
