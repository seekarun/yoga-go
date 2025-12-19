'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Webinar, WebinarStatus } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';
import LoadingSpinner from '@/components/LoadingSpinner';

interface WebinarWithStats extends Webinar {
  registrationCount?: number;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getStatusBadge(status: WebinarStatus) {
  const styles: Record<WebinarStatus, { bg: string; text: string; label: string }> = {
    DRAFT: { bg: '#f3f4f6', text: '#4b5563', label: 'Draft' },
    SCHEDULED: { bg: '#dbeafe', text: '#1d4ed8', label: 'Scheduled' },
    LIVE: { bg: '#fee2e2', text: '#dc2626', label: 'Live' },
    COMPLETED: { bg: '#d1fae5', text: '#059669', label: 'Completed' },
    CANCELLED: { bg: '#fef3c7', text: '#d97706', label: 'Cancelled' },
  };

  const style = styles[status] || styles.DRAFT;

  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: '600',
        background: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}

export default function ExpertWebinarsPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [webinars, setWebinars] = useState<WebinarWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [webinarToDelete, setWebinarToDelete] = useState<WebinarWithStats | null>(null);

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        console.log('[DBG][expert-webinars] Fetching webinars');
        const response = await fetch('/data/app/expert/me/webinars');
        const data = await response.json();

        if (data.success) {
          setWebinars(data.data || []);
        } else {
          setError(data.error || 'Failed to load webinars');
        }
      } catch (err) {
        console.error('[DBG][expert-webinars] Error:', err);
        setError('Failed to load webinars');
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  const handleDeleteClick = (webinar: WebinarWithStats) => {
    setWebinarToDelete(webinar);
  };

  const handleDeleteConfirm = async () => {
    if (!webinarToDelete) return;

    try {
      const response = await fetch(`/data/app/expert/me/webinars/${webinarToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setWebinars(webinars.filter(w => w.id !== webinarToDelete.id));
      } else {
        setError(data.error || 'Failed to delete webinar');
      }
    } catch (err) {
      console.error('[DBG][expert-webinars] Delete error:', err);
      setError('Failed to delete webinar');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Live Sessions</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage your live yoga sessions
              </p>
            </div>
            <Link
              href={`/srv/${expertId}/webinars/create`}
              className="px-6 py-2.5 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
              style={{ background: 'var(--color-primary)' }}
            >
              <svg
                style={{ width: '20px', height: '20px' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create Live Session
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-8">
        {error && (
          <div
            style={{
              background: '#fef2f2',
              color: '#dc2626',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {/* Webinars List */}
        {webinars.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '12px',
              padding: '60px 40px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>
              <svg
                style={{ width: '64px', height: '64px', margin: '0 auto', color: '#9ca3af' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
              No live sessions yet
            </h3>
            <p style={{ color: '#6b7280', marginBottom: '24px' }}>
              Create your first live yoga session and start engaging with your students
            </p>
            <Link
              href={`/srv/${expertId}/webinars/create`}
              style={{
                padding: '12px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Create Your First Live Session
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {webinars.map(webinar => {
              const nextSession = webinar.sessions[0];
              return (
                <div
                  key={webinar.id}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '20px',
                  }}
                >
                  {/* Thumbnail */}
                  <div
                    style={{
                      width: '120px',
                      height: '80px',
                      borderRadius: '8px',
                      background: webinar.thumbnail
                        ? `url(${webinar.thumbnail}) center/cover`
                        : 'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                      flexShrink: 0,
                    }}
                  />

                  {/* Content */}
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                      }}
                    >
                      <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                        {webinar.title}
                      </h3>
                      {getStatusBadge(webinar.status)}
                    </div>

                    <p
                      style={{
                        color: '#6b7280',
                        fontSize: '14px',
                        marginBottom: '12px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {webinar.description}
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        gap: '24px',
                        fontSize: '13px',
                        color: '#6b7280',
                      }}
                    >
                      <span>
                        {webinar.sessions.length} session{webinar.sessions.length !== 1 ? 's' : ''}
                      </span>
                      <span>{webinar.totalRegistrations || 0} registered</span>
                      <span>${webinar.price}</span>
                      {nextSession && (
                        <span>
                          Next: {formatDate(nextSession.startTime)} at{' '}
                          {formatTime(nextSession.startTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button
                      onClick={() => router.push(`/srv/${expertId}/webinars/${webinar.id}`)}
                      style={{
                        padding: '8px 16px',
                        background: '#f3f4f6',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(webinar)}
                      style={{
                        padding: '8px 16px',
                        background: '#fff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: '500',
                        cursor: 'pointer',
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!webinarToDelete}
        onClose={() => setWebinarToDelete(null)}
        message={`Are you sure you want to delete "${webinarToDelete?.title}"? This action cannot be undone.`}
        type="warning"
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  );
}
