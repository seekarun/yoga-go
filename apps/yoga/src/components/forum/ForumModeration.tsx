'use client';

import { useState, useRef, useEffect } from 'react';

interface ForumModerationProps {
  messageId: string;
  onDelete: (messageId: string) => Promise<void>;
}

export default function ForumModeration({ messageId, onDelete }: ForumModerationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowDeleteConfirm(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDelete = async () => {
    setShowDeleteConfirm(false);
    setIsOpen(false);
    await onDelete(messageId);
  };

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 8px',
          borderRadius: '4px',
          color: '#888',
        }}
        title="Options"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>

      {isOpen && !showDeleteConfirm && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '140px',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => setShowDeleteConfirm(true)}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 16px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
              color: '#d32f2f',
            }}
          >
            Delete
          </button>
        </div>
      )}

      {showDeleteConfirm && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            padding: '16px',
            minWidth: '200px',
            zIndex: 100,
          }}
        >
          <p style={{ fontSize: '14px', marginBottom: '12px' }}>Delete this message?</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleDelete}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                background: '#d32f2f',
                color: '#fff',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Delete
            </button>
            <button
              onClick={() => {
                setShowDeleteConfirm(false);
                setIsOpen(false);
              }}
              style={{
                flex: 1,
                padding: '8px',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                background: '#fff',
                color: '#666',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
