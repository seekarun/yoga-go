'use client';

import { useState } from 'react';
import type { Discussion } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';

interface ModerationMenuProps {
  discussion: Discussion;
  onModerate: (action: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function ModerationMenu({ discussion, onModerate, onDelete }: ModerationMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleAction = async (action: string) => {
    setIsProcessing(true);
    try {
      if (action === 'delete') {
        setShowDeleteConfirm(true);
        setIsProcessing(false);
        return;
      }
      await onModerate(action);
      setIsOpen(false);
    } catch (error) {
      console.error('[DBG][ModerationMenu] Action failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setIsProcessing(true);
    try {
      await onDelete();
      setIsOpen(false);
    } catch (error) {
      console.error('[DBG][ModerationMenu] Delete failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isProcessing}
        style={{
          background: 'none',
          border: 'none',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: isProcessing ? 0.5 : 1,
        }}
        aria-label="Moderation menu"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#666"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="1" />
          <circle cx="12" cy="5" r="1" />
          <circle cx="12" cy="19" r="1" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 999,
            }}
          />

          {/* Menu */}
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: '4px',
              background: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000,
              minWidth: '180px',
              overflow: 'hidden',
            }}
          >
            {/* Pin/Unpin */}
            <button
              onClick={() => handleAction(discussion.isPinned ? 'unpin' : 'pin')}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                fontSize: '14px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                if (!isProcessing) e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              📌 {discussion.isPinned ? 'Unpin' : 'Pin'}
            </button>

            {/* Resolve/Unresolve */}
            <button
              onClick={() => handleAction(discussion.isResolved ? 'unresolve' : 'resolve')}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                fontSize: '14px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                if (!isProcessing) e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              ✓ {discussion.isResolved ? 'Unresolve' : 'Mark as resolved'}
            </button>

            {/* Hide/Unhide */}
            <button
              onClick={() => handleAction(discussion.isHidden ? 'unhide' : 'hide')}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                fontSize: '14px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                if (!isProcessing) e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              👁️ {discussion.isHidden ? 'Unhide' : 'Hide'}
            </button>

            {/* Divider */}
            <div
              style={{
                height: '1px',
                background: '#e0e0e0',
                margin: '4px 0',
              }}
            />

            {/* Delete */}
            <button
              onClick={() => handleAction('delete')}
              disabled={isProcessing}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: 'none',
                background: 'none',
                textAlign: 'left',
                fontSize: '14px',
                color: '#d32f2f',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                if (!isProcessing) e.currentTarget.style.background = '#fff5f5';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'none';
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation */}
      <NotificationOverlay
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        message="Are you sure you want to delete this discussion?"
        type="warning"
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
}
