'use client';

import { useState } from 'react';

interface DiscussionFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitLabel?: string;
  autoFocus?: boolean;
}

export default function DiscussionForm({
  onSubmit,
  onCancel,
  placeholder = 'Share your thoughts...',
  submitLabel = 'Post',
  autoFocus = false,
}: DiscussionFormProps) {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(content.trim());
      setContent('');
      if (onCancel) onCancel();
    } catch (error) {
      console.error('[DBG][DiscussionForm] Submit failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        background: '#fff',
      }}
    >
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={isSubmitting}
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
          transition: 'border-color 0.2s',
        }}
        onFocus={e => {
          e.target.style.borderColor = '#ff6b35';
        }}
        onBlur={e => {
          e.target.style.borderColor = '#e0e0e0';
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            style={{
              padding: '8px 16px',
              border: '1px solid #e0e0e0',
              borderRadius: '6px',
              background: '#fff',
              color: '#666',
              fontSize: '14px',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              if (!isSubmitting) {
                e.currentTarget.style.background = '#f5f5f5';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#fff';
            }}
          >
            Cancel
          </button>
        )}

        <button
          type="submit"
          disabled={!content.trim() || isSubmitting}
          style={{
            padding: '8px 24px',
            border: 'none',
            borderRadius: '6px',
            background: !content.trim() || isSubmitting ? '#ccc' : '#ff6b35',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: !content.trim() || isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            if (content.trim() && !isSubmitting) {
              e.currentTarget.style.background = '#ff5722';
            }
          }}
          onMouseLeave={e => {
            if (content.trim() && !isSubmitting) {
              e.currentTarget.style.background = '#ff6b35';
            }
          }}
        >
          {isSubmitting ? 'Posting...' : submitLabel}
        </button>
      </div>
    </form>
  );
}
