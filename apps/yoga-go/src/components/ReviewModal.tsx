'use client';

import { useState } from 'react';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseId: string;
  courseTitle: string;
  onSuccess?: () => void;
}

export default function ReviewModal({
  isOpen,
  onClose,
  courseId,
  courseTitle,
  onSuccess,
}: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Comment must be at least 10 characters');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/courses/${courseId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to submit review');
        setIsSubmitting(false);
        return;
      }

      // Show success message
      setSuccess(true);

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Close modal after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('[DBG][ReviewModal] Error submitting review:', err);
      setError('Failed to submit review. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setRating(0);
      setComment('');
      setError('');
      setSuccess(false);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          maxWidth: '600px',
          width: '100%',
          padding: '32px',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={isSubmitting}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            color: '#666',
            padding: '4px',
          }}
          aria-label="Close"
        >
          ×
        </button>

        {success ? (
          // Success state
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div
              style={{
                fontSize: '48px',
                color: 'var(--color-primary)',
                marginBottom: '16px',
              }}
            >
              ✓
            </div>
            <h2 style={{ fontSize: '24px', marginBottom: '12px', color: '#1a202c' }}>
              Review Submitted!
            </h2>
            <p style={{ fontSize: '16px', color: '#666' }}>
              Thank you for your feedback. Your review will be visible after expert approval.
            </p>
          </div>
        ) : (
          // Review form
          <>
            <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#1a202c' }}>
              Write a Review
            </h2>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>{courseTitle}</p>

            <form onSubmit={handleSubmit}>
              {/* Star Rating */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#1a202c',
                  }}
                >
                  Rating *
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredRating(star)}
                      onMouseLeave={() => setHoveredRating(0)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '32px',
                        cursor: 'pointer',
                        padding: '0',
                        transition: 'transform 0.2s',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <span
                        style={{
                          color: star <= (hoveredRating || rating) ? '#fbbf24' : '#e5e7eb',
                        }}
                      >
                        ★
                      </span>
                    </button>
                  ))}
                  {rating > 0 && (
                    <span style={{ fontSize: '14px', color: '#666', marginLeft: '8px' }}>
                      {rating} out of 5
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="comment"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#1a202c',
                  }}
                >
                  Your Review *
                </label>
                <textarea
                  id="comment"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Share your experience with this course..."
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  disabled={isSubmitting}
                />
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  Minimum 10 characters ({comment.trim().length}/10)
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  style={{
                    padding: '12px',
                    background: '#fee2e2',
                    border: '1px solid #fecaca',
                    borderRadius: '8px',
                    color: '#dc2626',
                    fontSize: '14px',
                    marginBottom: '16px',
                  }}
                >
                  {error}
                </div>
              )}

              {/* Submit button */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  style={{
                    padding: '12px 24px',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    color: '#1a202c',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || rating === 0 || comment.trim().length < 10}
                  style={{
                    padding: '12px 24px',
                    background:
                      isSubmitting || rating === 0 || comment.trim().length < 10
                        ? '#e5e7eb'
                        : 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#fff',
                    cursor:
                      isSubmitting || rating === 0 || comment.trim().length < 10
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
