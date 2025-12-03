'use client';

import { useEffect, useState } from 'react';
import type { CourseReview } from '@/types';

interface ExpertReviewsTableProps {
  courseId: string;
  expertId: string;
}

export default function ExpertReviewsTable({
  courseId,
  expertId: _expertId,
}: ExpertReviewsTableProps) {
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [filteredReviews, setFilteredReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'published'>('pending');
  const [stats, setStats] = useState<{
    total: number;
    submitted: number;
    published: number;
    averageRating: number;
  }>({
    total: 0,
    submitted: 0,
    published: 0,
    averageRating: 0,
  });
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchReviews = async () => {
    console.log('[DBG][ExpertReviewsTable] Fetching reviews');
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/srv/courses/${courseId}/reviews`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to load reviews');
        setLoading(false);
        return;
      }

      setReviews(data.data.reviews || []);
      setStats(data.data.stats || { total: 0, submitted: 0, published: 0, averageRating: 0 });
      setLoading(false);
    } catch (err) {
      console.error('[DBG][ExpertReviewsTable] Error fetching reviews:', err);
      setError('Failed to load reviews');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchReviews is stable, only runs when courseId changes
  }, [courseId]);

  useEffect(() => {
    // Filter reviews based on active tab
    const filtered = reviews.filter(review =>
      activeTab === 'pending' ? review.status === 'submitted' : review.status === 'published'
    );
    setFilteredReviews(filtered);
  }, [reviews, activeTab]);

  const handleApprove = async (reviewId: string) => {
    console.log('[DBG][ExpertReviewsTable] Approving review:', reviewId);
    setApprovingId(reviewId);

    try {
      const response = await fetch(`/api/srv/courses/${courseId}/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'published',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to approve review');
        setApprovingId(null);
        return;
      }

      // Refresh reviews
      await fetchReviews();
      setApprovingId(null);
    } catch (err) {
      console.error('[DBG][ExpertReviewsTable] Error approving review:', err);
      alert('Failed to approve review');
      setApprovingId(null);
    }
  };

  const handleUnpublish = async (reviewId: string) => {
    console.log('[DBG][ExpertReviewsTable] Unpublishing review:', reviewId);
    setApprovingId(reviewId);

    try {
      const response = await fetch(`/api/srv/courses/${courseId}/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'submitted',
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert(data.error || 'Failed to unpublish review');
        setApprovingId(null);
        return;
      }

      // Refresh reviews
      await fetchReviews();
      setApprovingId(null);
    } catch (err) {
      console.error('[DBG][ExpertReviewsTable] Error unpublishing review:', err);
      alert('Failed to unpublish review');
      setApprovingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderStars = (rating: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            style={{
              color: star <= rating ? '#fbbf24' : '#e5e7eb',
              fontSize: '14px',
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

  return (
    <div>
      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            padding: '20px',
            background: '#f9fafb',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
          }}
        >
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '4px' }}>Total Reviews</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#1a202c' }}>{stats.total}</div>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#fef3c7',
            borderRadius: '12px',
            border: '1px solid #fbbf24',
          }}
        >
          <div style={{ fontSize: '14px', color: '#92400e', marginBottom: '4px' }}>
            Pending Approval
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#92400e' }}>
            {stats.submitted}
          </div>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#d1fae5',
            borderRadius: '12px',
            border: '1px solid #10b981',
          }}
        >
          <div style={{ fontSize: '14px', color: '#065f46', marginBottom: '4px' }}>Published</div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#065f46' }}>
            {stats.published}
          </div>
        </div>
        <div
          style={{
            padding: '20px',
            background: '#fff7ed',
            borderRadius: '12px',
            border: '1px solid #fb923c',
          }}
        >
          <div style={{ fontSize: '14px', color: '#9a3412', marginBottom: '4px' }}>
            Average Rating
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#9a3412' }}>
            {stats.averageRating.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '32px' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'pending' ? 'var(--color-primary)' : '#666',
              borderBottom:
                activeTab === 'pending'
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            Pending ({stats.submitted})
          </button>
          <button
            onClick={() => setActiveTab('published')}
            style={{
              padding: '12px 0',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              color: activeTab === 'published' ? 'var(--color-primary)' : '#666',
              borderBottom:
                activeTab === 'published'
                  ? '2px solid var(--color-primary)'
                  : '2px solid transparent',
              marginBottom: '-2px',
            }}
          >
            Published ({stats.published})
          </button>
        </div>
      </div>

      {/* Reviews Table */}
      {filteredReviews.length === 0 ? (
        <div style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>
            {activeTab === 'pending' ? '📭' : '📝'}
          </div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#1a202c' }}>
            No {activeTab} reviews
          </h3>
          <p style={{ fontSize: '14px', color: '#666' }}>
            {activeTab === 'pending'
              ? 'All reviews have been reviewed'
              : 'No published reviews yet'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredReviews.map(review => (
            <div
              key={review.id}
              style={{
                padding: '20px',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                background: '#fff',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '20px' }}>
                {/* Review Info */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '8px',
                    }}
                  >
                    <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                      {review.user}
                    </h4>
                    {renderStars(review.rating)}
                    <span style={{ fontSize: '13px', color: '#666' }}>
                      {formatDate(review.date)}
                    </span>
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
                  <p
                    style={{
                      fontSize: '14px',
                      lineHeight: '1.6',
                      color: '#4a5568',
                      margin: '0 0 8px 0',
                    }}
                  >
                    {review.comment}
                  </p>
                  {review.courseProgress !== undefined && review.courseProgress > 0 && (
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Progress: {review.courseProgress}%
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  {activeTab === 'pending' ? (
                    <button
                      onClick={() => handleApprove(review.id)}
                      disabled={approvingId === review.id}
                      style={{
                        padding: '10px 20px',
                        background:
                          approvingId === review.id
                            ? '#e5e7eb'
                            : 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: approvingId === review.id ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {approvingId === review.id ? 'Publishing...' : 'Publish Review'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnpublish(review.id)}
                      disabled={approvingId === review.id}
                      style={{
                        padding: '10px 20px',
                        background: approvingId === review.id ? '#e5e7eb' : '#fff',
                        color: approvingId === review.id ? '#666' : '#dc2626',
                        border: '1px solid #dc2626',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: approvingId === review.id ? 'not-allowed' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {approvingId === review.id ? 'Unpublishing...' : 'Unpublish'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
