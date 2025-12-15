'use client';

import { useState } from 'react';

interface WebinarFeedbackFormProps {
  webinarId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function WebinarFeedbackForm({
  webinarId,
  onSuccess,
  onCancel,
}: WebinarFeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`/data/app/webinars/${webinarId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        if (onSuccess) {
          setTimeout(onSuccess, 1500);
        }
      } else {
        setError(data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('[DBG][WebinarFeedbackForm] Error:', err);
      setError('Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div
        style={{
          padding: '32px',
          textAlign: 'center',
          background: '#f0fdf4',
          borderRadius: '12px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>Thank you!</div>
        <p style={{ color: '#166534', fontSize: '16px' }}>
          Your feedback has been submitted successfully.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '12px',
          }}
        >
          How would you rate this webinar?
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '32px',
                color: star <= (hoverRating || rating) ? '#f59e0b' : '#d1d5db',
                transition: 'color 0.2s, transform 0.2s',
                transform: star <= (hoverRating || rating) ? 'scale(1.1)' : 'scale(1)',
              }}
            >
              ★
            </button>
          ))}
        </div>
        <p style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent!'}
        </p>
      </div>

      <div style={{ marginBottom: '24px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '8px',
          }}
        >
          Your feedback
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="What did you like about this webinar? How could it be improved?"
          rows={4}
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '15px',
            resize: 'vertical',
          }}
        />
        <p style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
          {comment.length} / 10 characters minimum
        </p>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '12px 24px',
              background: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          style={{
            padding: '12px 24px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: submitting ? 'not-allowed' : 'pointer',
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting ? 'Submitting...' : 'Submit Feedback'}
        </button>
      </div>
    </form>
  );
}
