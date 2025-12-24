'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/LoadingSpinner';
import NotificationOverlay from '@/components/NotificationOverlay';

type FilterType = 'pending' | 'approved' | 'rejected' | 'all';

interface ReviewItem {
  id: string;
  name: string;
  avatar?: string;
  flagReason?: string;
  flaggedAt?: string;
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  reviewedBy?: string;
  primaryDomain?: string;
  createdAt?: string;
}

type PendingAction = {
  type: 'approve' | 'reject';
  expertId: string;
  expertName: string;
} | null;

export default function AdminReviewsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAdmin } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('pending');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && user && !isAdmin) {
      console.log('[DBG][admn/reviews] User is not admin, redirecting');
      router.push('/app');
    }
  }, [user, authLoading, isAdmin, router]);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[DBG][admn/reviews] Fetching reviews with status:', filter);

      const response = await fetch(`/data/admn/reviews?status=${filter}`);
      const data = await response.json();

      if (data.success) {
        setReviews(data.data || []);
      } else {
        setError(data.error || 'Failed to load reviews');
      }
    } catch (err) {
      console.error('[DBG][admn/reviews] Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) {
      fetchReviews();
    }
  }, [isAdmin, fetchReviews]);

  const handleAction = (expertId: string, expertName: string, action: 'approve' | 'reject') => {
    setPendingAction({ type: action, expertId, expertName });
  };

  const confirmAction = async () => {
    if (!pendingAction) return;

    try {
      setActionLoading(true);

      const response = await fetch('/data/admn/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expertId: pendingAction.expertId,
          action: pendingAction.type,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setNotification({
          message: `Expert "${pendingAction.expertName}" ${pendingAction.type}d successfully`,
          type: 'success',
        });
        // Refresh the list
        fetchReviews();
      } else {
        setNotification({
          message: data.error || `Failed to ${pendingAction.type} expert`,
          type: 'error',
        });
      }
    } catch (err) {
      console.error('[DBG][admn/reviews] Error processing action:', err);
      setNotification({
        message: `Failed to ${pendingAction.type} expert`,
        type: 'error',
      });
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="lg" message="Loading..." />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Access denied. Admin only.</div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f7fafc' }}>
      {/* Header */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
          color: '#fff',
          padding: '40px 20px',
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div className="flex items-center gap-4">
            <Link
              href="/admn"
              className="p-2 -ml-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div>
              <h1 style={{ fontSize: '36px', fontWeight: '600', marginBottom: '8px' }}>
                Expert ID Reviews
              </h1>
              <p style={{ fontSize: '16px', opacity: 0.9 }}>
                Review flagged expert IDs before they can publish
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="px-6 lg:px-8 py-6" style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">!</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-4 border-b border-gray-200">
            <div className="flex gap-2">
              {(['pending', 'approved', 'rejected', 'all'] as FilterType[]).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f === 'pending'
                    ? 'Pending'
                    : f === 'approved'
                      ? 'Approved'
                      : f === 'rejected'
                        ? 'Rejected'
                        : 'All'}
                </button>
              ))}
            </div>
          </div>

          {/* Reviews List */}
          {loading ? (
            <div className="p-12 text-center">
              <LoadingSpinner size="md" message="Loading reviews..." />
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-12 text-center">
              <svg
                className="w-12 h-12 mx-auto text-gray-300 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-gray-500">
                {filter === 'pending'
                  ? 'No pending reviews'
                  : filter === 'approved'
                    ? 'No approved experts'
                    : filter === 'rejected'
                      ? 'No rejected experts'
                      : 'No flagged experts'}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                Expert IDs flagged by AI will appear here for review
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {reviews.map(review => (
                <div key={review.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {review.avatar ? (
                        <Image
                          src={review.avatar}
                          alt={review.name}
                          width={48}
                          height={48}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 text-lg font-medium">
                            {review.name?.[0]?.toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-base font-semibold text-gray-900">{review.name}</h3>
                        {getStatusBadge(review.reviewStatus)}
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {review.id}
                        </span>
                        {review.primaryDomain && (
                          <span className="ml-2 text-gray-400">({review.primaryDomain})</span>
                        )}
                      </div>

                      {review.flagReason && (
                        <div className="text-sm text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                          <span className="font-medium">AI Flag Reason:</span> {review.flagReason}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>Flagged: {formatDate(review.flaggedAt)}</span>
                        {review.reviewedAt && (
                          <span>Reviewed: {formatDate(review.reviewedAt)}</span>
                        )}
                        {review.createdAt && (
                          <span>Account created: {formatDate(review.createdAt)}</span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {review.reviewStatus === 'pending' && (
                      <div className="flex-shrink-0 flex gap-2">
                        <button
                          onClick={() => handleAction(review.id, review.name, 'approve')}
                          className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(review.id, review.name, 'reject')}
                          className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {review.reviewStatus === 'approved' && (
                      <div className="flex-shrink-0">
                        <Link
                          href={`https://${review.primaryDomain}`}
                          target="_blank"
                          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          View Site
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!pendingAction}
        onClose={() => !actionLoading && setPendingAction(null)}
        message={
          pendingAction
            ? `Are you sure you want to ${pendingAction.type} the expert ID "${pendingAction.expertName}"? ${
                pendingAction.type === 'approve'
                  ? 'They will be able to publish their landing page.'
                  : 'They will NOT be able to publish. They should be notified with a reason.'
              }`
            : ''
        }
        type={pendingAction?.type === 'approve' ? 'info' : 'warning'}
        onConfirm={confirmAction}
        confirmText={
          actionLoading ? 'Processing...' : pendingAction?.type === 'approve' ? 'Approve' : 'Reject'
        }
        cancelText="Cancel"
      />

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type={notification?.type || 'success'}
        duration={4000}
      />
    </div>
  );
}
