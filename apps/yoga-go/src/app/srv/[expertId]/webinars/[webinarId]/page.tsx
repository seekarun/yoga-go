'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Webinar, WebinarStatus, VideoPlatform } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';

export default function EditWebinarPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const webinarId = params.webinarId as string;

  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [status, setStatus] = useState<WebinarStatus>('DRAFT');
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('none');
  const [googleConnected, setGoogleConnected] = useState(false);
  const [zoomConnected, setZoomConnected] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const fetchWebinar = async () => {
      try {
        const response = await fetch(`/data/app/expert/me/webinars/${webinarId}`);
        const data = await response.json();

        if (data.success) {
          const w = data.data;
          setWebinar(w);
          setTitle(w.title);
          setDescription(w.description);
          setPrice(String(w.price));
          setMaxParticipants(w.maxParticipants ? String(w.maxParticipants) : '');
          setStatus(w.status);
          setVideoPlatform(w.videoPlatform || 'none');
          setGoogleConnected(w.googleConnected || false);
          setZoomConnected(w.zoomConnected || false);
        } else {
          setError(data.error || 'Failed to load webinar');
        }
      } catch (err) {
        console.error('[DBG][edit-webinar] Error:', err);
        setError('Failed to load webinar');
      } finally {
        setLoading(false);
      }
    };

    fetchWebinar();
  }, [webinarId]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/data/app/expert/me/webinars/${webinarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price) || 0,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
          videoPlatform,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWebinar(data.data);
        setStatus(data.data.status);
        setSuccess('Webinar saved successfully');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save webinar');
      }
    } catch (err) {
      console.error('[DBG][edit-webinar] Save error:', err);
      setError('Failed to save webinar');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishClick = () => {
    setShowPublishConfirm(true);
  };

  const handlePublishConfirm = async () => {
    setPublishing(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/data/app/expert/me/webinars/${webinarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          price: parseFloat(price) || 0,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
          videoPlatform,
          status: 'SCHEDULED',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWebinar(data.data);
        setStatus(data.data.status);
        setSuccess('Webinar published successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to publish webinar');
      }
    } catch (err) {
      console.error('[DBG][edit-webinar] Publish error:', err);
      setError('Failed to publish webinar');
    } finally {
      setPublishing(false);
    }
  };

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleCancelConfirm = async () => {
    setCancelling(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/data/app/expert/me/webinars/${webinarId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CANCELLED',
        }),
      });

      const data = await response.json();

      if (data.success) {
        setWebinar(data.data);
        setStatus(data.data.status);
        setSuccess('Webinar cancelled. Cancellation emails will be sent to registered users.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to cancel webinar');
      }
    } catch (err) {
      console.error('[DBG][edit-webinar] Cancel error:', err);
      setError('Failed to cancel webinar');
    } finally {
      setCancelling(false);
    }
  };

  const handleGenerateMeetLinks = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/data/app/expert/me/webinars/${webinarId}/meet`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Meet links generated successfully');
        // Refresh webinar data
        const refreshResponse = await fetch(`/data/app/expert/me/webinars/${webinarId}`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setWebinar(refreshData.data);
        }
      } else {
        setError(data.error || 'Failed to generate Meet links');
      }
    } catch (err) {
      console.error('[DBG][edit-webinar] Meet error:', err);
      setError('Failed to generate Meet links');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateZoomLinks = async () => {
    setSaving(true);
    setError('');

    try {
      const response = await fetch(`/data/app/expert/me/webinars/${webinarId}/zoom`, {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Zoom links generated successfully');
        // Refresh webinar data
        const refreshResponse = await fetch(`/data/app/expert/me/webinars/${webinarId}`);
        const refreshData = await refreshResponse.json();
        if (refreshData.success) {
          setWebinar(refreshData.data);
        }
      } else {
        setError(data.error || 'Failed to generate Zoom links');
      }
    } catch (err) {
      console.error('[DBG][edit-webinar] Zoom error:', err);
      setError('Failed to generate Zoom links');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '16px' }}>Webinar not found</h2>
        <Link href={`/srv/${expertId}/webinars`} style={{ color: 'var(--color-primary)' }}>
          Back to webinars
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link
          href={`/srv/${expertId}/webinars`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6b7280',
            fontSize: '14px',
            textDecoration: 'none',
            marginBottom: '16px',
          }}
        >
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Webinars
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: '600' }}>Edit Webinar</h1>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '16px',
              fontSize: '13px',
              fontWeight: '600',
              background:
                status === 'DRAFT'
                  ? '#f3f4f6'
                  : status === 'SCHEDULED'
                    ? '#dbeafe'
                    : status === 'LIVE'
                      ? '#fee2e2'
                      : '#d1fae5',
              color:
                status === 'DRAFT'
                  ? '#4b5563'
                  : status === 'SCHEDULED'
                    ? '#1d4ed8'
                    : status === 'LIVE'
                      ? '#dc2626'
                      : '#059669',
            }}
          >
            {status}
          </span>
        </div>
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

      {success && (
        <div
          style={{
            background: '#f0fdf4',
            color: '#16a34a',
            padding: '16px',
            borderRadius: '8px',
            marginBottom: '24px',
          }}
        >
          {success}
        </div>
      )}

      {/* Basic Info */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
          Basic Information
        </h2>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
          >
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '15px',
            }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
          >
            Description
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '15px',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Price ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={e => setPrice(e.target.value)}
              min="0"
              step="0.01"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
              }}
            />
          </div>
          <div>
            <label
              style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
            >
              Max Participants
            </label>
            <input
              type="number"
              value={maxParticipants}
              onChange={e => setMaxParticipants(e.target.value)}
              min="1"
              placeholder="Unlimited"
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '15px',
              }}
            />
          </div>
        </div>

        {/* Video Platform */}
        <div style={{ marginTop: '20px' }}>
          <label
            style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}
          >
            Video Platform
          </label>
          <select
            value={videoPlatform}
            onChange={e => setVideoPlatform(e.target.value as VideoPlatform)}
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '12px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '15px',
              background: '#fff',
            }}
          >
            <option value="none">None</option>
            <option value="google_meet">Google Meet</option>
            <option value="zoom">Zoom</option>
          </select>
          {videoPlatform === 'google_meet' && !googleConnected && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>
              Google Calendar is not connected.{' '}
              <a
                href={`/srv/${expertId}/settings/google`}
                style={{ color: 'var(--color-primary)' }}
              >
                Connect now
              </a>
            </p>
          )}
          {videoPlatform === 'zoom' && !zoomConnected && (
            <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>
              Zoom is not connected.{' '}
              <a href={`/srv/${expertId}/settings/zoom`} style={{ color: 'var(--color-primary)' }}>
                Connect now
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Sessions */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
            Sessions ({webinar.sessions.length})
          </h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            {/* Google Meet button */}
            {videoPlatform === 'google_meet' &&
              googleConnected &&
              webinar.sessions.some(s => !s.googleMeetLink) && (
                <button
                  onClick={handleGenerateMeetLinks}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    background: '#4285f4',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg
                    style={{ width: '16px', height: '16px' }}
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm-2 17l-5-5 1.41-1.41 3.59 3.58 7.59-7.59 1.41 1.42-9 9z" />
                  </svg>
                  Generate Meet Links
                </button>
              )}
            {/* Zoom button */}
            {videoPlatform === 'zoom' &&
              zoomConnected &&
              webinar.sessions.some(s => !s.zoomMeetingLink) && (
                <button
                  onClick={handleGenerateZoomLinks}
                  disabled={saving}
                  style={{
                    padding: '8px 16px',
                    background: '#2D8CFF',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: '500',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    opacity: saving ? 0.7 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M4.5 5.25a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-3.75l4.5 3.75V6l-4.5 3.75V6a.75.75 0 0 0-.75-.75H4.5z" />
                  </svg>
                  Generate Zoom Links
                </button>
              )}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {webinar.sessions.map((session, idx) => (
            <div
              key={session.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px',
                    }}
                  >
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
                      {session.title}
                    </h3>
                  </div>
                  {session.description && (
                    <p style={{ fontSize: '14px', color: '#6b7280', margin: '8px 0 0' }}>
                      {session.description}
                    </p>
                  )}
                  <div
                    style={{
                      marginTop: '8px',
                      fontSize: '13px',
                      color: '#6b7280',
                    }}
                  >
                    {new Date(session.startTime).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}{' '}
                    at{' '}
                    {new Date(session.startTime).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}{' '}
                    ({session.duration} min)
                  </div>
                </div>
                {/* Video conference link */}
                {session.zoomMeetingLink ? (
                  <a
                    href={session.zoomMeetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: '#2D8CFF',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                      <path d="M4.5 5.25a.75.75 0 0 0-.75.75v12a.75.75 0 0 0 .75.75h10.5a.75.75 0 0 0 .75-.75v-3.75l4.5 3.75V6l-4.5 3.75V6a.75.75 0 0 0-.75-.75H4.5z" />
                    </svg>
                    Join Zoom
                  </a>
                ) : session.googleMeetLink ? (
                  <a
                    href={session.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '6px 12px',
                      background: '#4285f4',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      textDecoration: 'none',
                    }}
                  >
                    Join Meet
                  </a>
                ) : (
                  <span
                    style={{
                      padding: '6px 12px',
                      background: '#f3f4f6',
                      color: '#6b7280',
                      borderRadius: '6px',
                      fontSize: '12px',
                    }}
                  >
                    No video link
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Statistics</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--color-primary)' }}>
              {webinar.totalRegistrations}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Registrations</div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>
              {webinar.rating?.toFixed(1) || '-'}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>
              Rating ({webinar.totalRatings || 0} reviews)
            </div>
          </div>
          <div>
            <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>
              ${(webinar.totalRegistrations * webinar.price).toFixed(0)}
            </div>
            <div style={{ fontSize: '14px', color: '#6b7280' }}>Revenue</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        {/* Cancel Webinar - only for SCHEDULED or LIVE webinars */}
        {(status === 'SCHEDULED' || status === 'LIVE') && (
          <button
            onClick={handleCancelClick}
            disabled={saving || publishing || cancelling}
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#dc2626',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: saving || publishing || cancelling ? 'not-allowed' : 'pointer',
              opacity: cancelling ? 0.7 : 1,
              marginRight: 'auto',
            }}
          >
            {cancelling ? 'Cancelling...' : 'Cancel Webinar'}
          </button>
        )}
        <button
          onClick={() => router.push(`/srv/${expertId}/webinars`)}
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
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving || publishing || cancelling}
          style={{
            padding: '12px 24px',
            background: '#fff',
            color: '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: saving || publishing || cancelling ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        {status === 'DRAFT' && (
          <button
            onClick={handlePublishClick}
            disabled={saving || publishing || cancelling}
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: saving || publishing || cancelling ? 'not-allowed' : 'pointer',
              opacity: publishing ? 0.7 : 1,
            }}
          >
            {publishing ? 'Publishing...' : 'Publish'}
          </button>
        )}
      </div>

      {/* Publish Confirmation Overlay */}
      <NotificationOverlay
        isOpen={showPublishConfirm}
        onClose={() => setShowPublishConfirm(false)}
        message="Are you sure you want to publish this webinar? It will be visible to users and they can start registering."
        type="info"
        onConfirm={handlePublishConfirm}
        confirmText="Publish"
        cancelText="Keep as Draft"
      />

      {/* Cancel Webinar Confirmation Overlay */}
      <NotificationOverlay
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        message={`Are you sure you want to cancel this webinar? ${webinar?.totalRegistrations ? `Cancellation emails will be sent to ${webinar.totalRegistrations} registered user${webinar.totalRegistrations > 1 ? 's' : ''}.` : 'This action cannot be undone.'}`}
        type="error"
        onConfirm={handleCancelConfirm}
        confirmText="Cancel Webinar"
        cancelText="Keep Webinar"
      />
    </div>
  );
}
