'use client';

import { useState } from 'react';

interface ForumPostFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}

export default function ForumPostForm({
  onSubmit,
  onCancel,
  placeholder = 'Write something...',
  submitLabel = 'Post',
  autoFocus = false,
  disabled = false,
}: ForumPostFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting || disabled) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (error) {
      console.error('[DBG][ForumPostForm] Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleSubmit();
    }
  };

  return (
    <div
      style={{
        background: 'rgba(128,128,128,0.08)',
        border: '1px solid rgba(128,128,128,0.2)',
        borderRadius: '8px',
        padding: '12px',
      }}
    >
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isSubmitting || disabled}
        autoFocus={autoFocus}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px',
          border: '1px solid rgba(128,128,128,0.2)',
          borderRadius: '6px',
          fontSize: '14px',
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none',
          marginBottom: '8px',
          opacity: disabled ? 0.6 : 1,
          background: 'transparent',
          color: 'inherit',
        }}
      />

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              border: '1px solid rgba(128,128,128,0.3)',
              borderRadius: '6px',
              background: 'transparent',
              color: 'inherit',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting || disabled}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '6px',
            background:
              !content.trim() || isSubmitting || disabled ? '#999' : 'var(--brand-500, #ff6b35)',
            color: '#fff',
            fontSize: '14px',
            cursor: !content.trim() || isSubmitting || disabled ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Posting...' : submitLabel}
        </button>
      </div>

      <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '8px' }}>
        Press Cmd+Enter or Ctrl+Enter to submit
      </p>
    </div>
  );
}
