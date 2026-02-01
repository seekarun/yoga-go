'use client';

import { useEffect, useState } from 'react';
import type { CourseReview } from '@/types';

interface ReviewsListProps {
  courseId: string;
  showStats?: boolean;
}

export default function ReviewsList({ courseId, showStats = true }: ReviewsListProps) {
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<{ total: number; averageRating: number }>({
    total: 0,
    averageRating: 0,
  });

  useEffect(() => {
    const fetchReviews = async () => {
      console.log('[DBG][ReviewsList] Fetching reviews for course:', courseId);
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/courses/${courseId}/reviews`);
        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to load reviews');
          setLoading(false);
          return;
        }

        setReviews(data.data || []);
        setStats({
          total: data.total || 0,
          averageRating:
            data.total > 0
              ? Math.round(
                  (data.data.reduce((sum: number, r: CourseReview) => sum + r.rating, 0) /
                    data.total) *
                    10
                ) / 10
              : 0,
        });
        setLoading(false);
      } catch (err) {
        console.error('[DBG][ReviewsList] Error fetching reviews:', err);
        setError('Failed to load reviews');
        setLoading(false);
      }
    };

    fetchReviews();
  }, [courseId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '4px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            style={{
              color: star <= rating ? '#fbbf24' : '#e5e7eb',
              fontSize: '16px',
            }}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading reviews...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#dc2626' }}>{error}</div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
        <h3 style={{ fontSize: '20px', marginBottom: '8px', color: '#1a202c' }}>No reviews yet</h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Be the first to share your experience with this course!
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Stats Section */}
      {showStats && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '24px',
            background: '#f9fafb',
            borderRadius: '12px',
            marginBottom: '32px',
          }}
        >
          <div>
            <div style={{ fontSize: '48px', fontWeight: '700', color: '#1a202c' }}>
              {stats.averageRating.toFixed(1)}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <span
                  key={star}
                  style={{
                    color: star <= Math.round(stats.averageRating) ? '#fbbf24' : '#e5e7eb',
                    fontSize: '20px',
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              {stats.total} {stats.total === 1 ? 'review' : 'reviews'}
            </div>
          </div>
        </div>
      )}

      {/* Reviews List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {reviews.map(review => (
          <div
            key={review.id}
            style={{
              padding: '24px',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              background: '#fff',
            }}
          >
            {/* Review Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                    {review.user}
                  </h4>
                  {review.verified && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        color: 'var(--color-primary)',
                        background: 'rgba(118, 75, 162, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      VERIFIED
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                  {formatDate(review.date)}
                </div>
              </div>
              <div>{renderStars(review.rating)}</div>
            </div>

            {/* Review Comment */}
            <p
              style={{
                fontSize: '15px',
                lineHeight: '1.6',
                color: '#4a5568',
                margin: 0,
              }}
            >
              {review.comment}
            </p>

            {/* Course Progress Badge (if available) */}
            {review.courseProgress !== undefined && review.courseProgress > 0 && (
              <div style={{ marginTop: '12px' }}>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#666',
                    background: '#f3f4f6',
                    padding: '4px 10px',
                    borderRadius: '6px',
                  }}
                >
                  Course progress: {review.courseProgress}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
