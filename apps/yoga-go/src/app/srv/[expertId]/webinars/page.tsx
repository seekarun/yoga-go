'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Webinar, WebinarStatus } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';
import LoadingSpinner from '@/components/LoadingSpinner';
import { formatPrice } from '@/lib/currency/currencyService';
import { getSubdomainUrl } from '@/config/env';

interface WebinarWithStats extends Webinar {
  registrationCount?: number;
}

interface InstantSessionData {
  webinarId: string;
  sessionId: string;
  title: string;
  joinUrl: string;
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
  const [creatingInstant, setCreatingInstant] = useState(false);
  const [instantSession, setInstantSession] = useState<InstantSessionData | null>(null);
  const [copied, setCopied] = useState(false);

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

  const handleCreateInstantSession = async () => {
    setCreatingInstant(true);
    setError('');

    try {
      const response = await fetch('/data/app/expert/me/webinars/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (data.success) {
        const baseUrl = getSubdomainUrl(expertId);
        setInstantSession({
          webinarId: data.data.webinarId,
          sessionId: data.data.sessionId,
          title: data.data.title,
          joinUrl: `${baseUrl}/app/live/${data.data.webinarId}/${data.data.sessionId}`,
        });
      } else {
        setError(data.error || 'Failed to create instant session');
      }
    } catch (err) {
      console.error('[DBG][expert-webinars] Instant session error:', err);
      setError('Failed to create instant session');
    } finally {
      setCreatingInstant(false);
    }
  };

  const handleCopyLink = async () => {
    if (!instantSession) return;
    try {
      await navigator.clipboard.writeText(instantSession.joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[DBG][expert-webinars] Copy error:', err);
    }
  };

  const handleStartInstantSession = () => {
    if (!instantSession) return;
    router.push(`/app/live/${instantSession.webinarId}/${instantSession.sessionId}`);
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
      <div className="px-6 lg:px-8 py-6">
        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mb-6">
          <button
            onClick={handleCreateInstantSession}
            disabled={creatingInstant}
            className="px-6 py-2.5 text-white text-sm font-semibold rounded-lg flex items-center gap-2"
            style={{
              background: '#10b981',
              cursor: creatingInstant ? 'not-allowed' : 'pointer',
              opacity: creatingInstant ? 0.7 : 1,
            }}
          >
            {creatingInstant ? (
              <>
                <svg
                  className="animate-spin"
                  style={{ width: '20px', height: '20px' }}
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Creating...
              </>
            ) : (
              <>
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Instant Live Session
              </>
            )}
          </button>
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Schedule Live Session
          </Link>
        </div>
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
                  onClick={() => router.push(`/srv/${expertId}/webinars/${webinar.id}`)}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--color-primary)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.boxShadow = 'none';
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
                      <span>{formatPrice(webinar.price, webinar.currency || 'USD')}</span>
                      {nextSession && (
                        <span>
                          Next: {formatDate(nextSession.startTime)} at{' '}
                          {formatTime(nextSession.startTime)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', gap: '8px', flexShrink: 0 }}
                    onClick={e => e.stopPropagation()}
                  >
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

      {/* Instant Session Modal */}
      {instantSession && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setInstantSession(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '32px',
              width: '100%',
              maxWidth: '480px',
              margin: '20px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#dcfce7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <svg
                  style={{ width: '32px', height: '32px', color: '#16a34a' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                Session Ready!
              </h2>
              <p style={{ color: '#6b7280', fontSize: '14px' }}>
                Your instant live session has been created
              </p>
            </div>

            <div
              style={{
                background: '#f9fafb',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#6b7280',
                  marginBottom: '8px',
                }}
              >
                Share this link with participants
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={instantSession.joinUrl}
                  readOnly
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: '#fff',
                  }}
                />
                <button
                  onClick={handleCopyLink}
                  style={{
                    padding: '10px 16px',
                    background: copied ? '#16a34a' : '#f3f4f6',
                    color: copied ? '#fff' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                  }}
                >
                  {copied ? (
                    <>
                      <svg
                        style={{ width: '16px', height: '16px' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg
                        style={{ width: '16px', height: '16px' }}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setInstantSession(null)}
                style={{
                  flex: 1,
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
                Close
              </button>
              <button
                onClick={handleStartInstantSession}
                style={{
                  flex: 1,
                  padding: '12px 24px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
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
                    d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Start Session
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
