'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { WebinarSession, VideoPlatform, SupportedCurrency, Expert } from '@/types';
import { SUPPORTED_CURRENCIES, DEFAULT_CURRENCY } from '@/config/currencies';

interface SessionInput {
  id: string;
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface IntegrationStatus {
  google: { connected: boolean; email?: string };
  zoom: { connected: boolean; email?: string };
}

export default function CreateWebinarPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [expertCurrency, setExpertCurrency] = useState<SupportedCurrency>(DEFAULT_CURRENCY);
  const [currencySymbol, setCurrencySymbol] = useState('$');
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus>({
    google: { connected: false },
    zoom: { connected: false },
  });

  // Fetch integration status
  const fetchIntegrationStatus = useCallback(async () => {
    try {
      const [googleRes, zoomRes] = await Promise.all([
        fetch('/api/auth/google-calendar/status'),
        fetch('/api/auth/zoom/status'),
      ]);
      const [googleData, zoomData] = await Promise.all([googleRes.json(), zoomRes.json()]);

      setIntegrationStatus({
        google: googleData.success ? googleData.data : { connected: false },
        zoom: zoomData.success ? zoomData.data : { connected: false },
      });
    } catch (err) {
      console.error('[DBG][create-webinar] Error fetching integration status:', err);
    }
  }, []);

  // Fetch expert's preferred currency
  const fetchExpertCurrency = useCallback(async () => {
    try {
      const response = await fetch('/data/app/expert/me');
      const data = await response.json();
      if (data.success && data.data) {
        const expert: Expert = data.data;
        const currency = expert.platformPreferences?.currency || DEFAULT_CURRENCY;
        setExpertCurrency(currency);
        setCurrencySymbol(SUPPORTED_CURRENCIES[currency].symbol);
      }
    } catch (err) {
      console.error('[DBG][create-webinar] Error fetching expert currency:', err);
    }
  }, []);

  useEffect(() => {
    fetchExpertCurrency();
    fetchIntegrationStatus();
  }, [fetchExpertCurrency, fetchIntegrationStatus]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [videoPlatform, setVideoPlatform] = useState<VideoPlatform>('none');
  const [sessions, setSessions] = useState<SessionInput[]>([
    {
      id: '1',
      title: 'Session 1',
      description: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
    },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState('');

  const addSession = () => {
    const newSession: SessionInput = {
      id: Date.now().toString(),
      title: `Session ${sessions.length + 1}`,
      description: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
      duration: 60,
    };
    setSessions([...sessions, newSession]);
  };

  const removeSession = (id: string) => {
    if (sessions.length <= 1) return;
    setSessions(sessions.filter(s => s.id !== id));
  };

  const updateSession = (id: string, field: keyof SessionInput, value: string | number) => {
    setSessions(
      sessions.map(s => {
        if (s.id === id) {
          const updated = { ...s, [field]: value };
          // Auto-calculate duration when times change
          if (field === 'startTime' || field === 'endTime') {
            const [startH, startM] = updated.startTime.split(':').map(Number);
            const [endH, endM] = updated.endTime.split(':').map(Number);
            const startMins = startH * 60 + startM;
            const endMins = endH * 60 + endM;
            updated.duration = Math.max(0, endMins - startMins);
          }
          return updated;
        }
        return s;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent, shouldPublish: boolean = false) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please enter a title');
      return;
    }

    if (!description.trim()) {
      setError('Please enter a description');
      return;
    }

    // Validate sessions
    for (const session of sessions) {
      if (!session.date) {
        setError('Please select a date for all sessions');
        return;
      }
      if (!session.title.trim()) {
        setError('Please enter a title for all sessions');
        return;
      }
    }

    if (shouldPublish) {
      setPublishing(true);
    } else {
      setSubmitting(true);
    }

    try {
      // Convert sessions to API format
      const formattedSessions: Partial<WebinarSession>[] = sessions.map(s => {
        const startDateTime = new Date(`${s.date}T${s.startTime}:00`);
        const endDateTime = new Date(`${s.date}T${s.endTime}:00`);
        return {
          title: s.title,
          description: s.description,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          duration: s.duration,
        };
      });

      const response = await fetch('/data/app/expert/me/webinars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          price: parseFloat(price) || 0,
          currency: expertCurrency,
          maxParticipants: maxParticipants ? parseInt(maxParticipants) : undefined,
          videoPlatform,
          status: shouldPublish ? 'SCHEDULED' : 'DRAFT',
          sessions: formattedSessions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/srv/${expertId}/webinars/${data.data.id}`);
      } else {
        setError(data.error || 'Failed to create webinar');
      }
    } catch (err) {
      console.error('[DBG][create-webinar] Error:', err);
      setError('Failed to create webinar');
    } finally {
      setSubmitting(false);
      setPublishing(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '800px', margin: '0 auto' }}>
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
          Back to Live Sessions
        </Link>
        <h1 style={{ fontSize: '28px', fontWeight: '600' }}>Create Live Session</h1>
      </div>

      <form onSubmit={handleSubmit}>
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
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Morning Yoga Flow"
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
              Description *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe what participants will learn..."
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
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
              >
                Price ({currencySymbol} {expertCurrency})
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
                style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  marginBottom: '8px',
                }}
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

          <div style={{ marginTop: '20px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                marginBottom: '12px',
              }}
            >
              Video Platform
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  border: `2px solid ${videoPlatform === '100ms' ? 'var(--color-primary)' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background:
                    videoPlatform === '100ms' ? 'var(--color-primary-light, #f0f9ff)' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="videoPlatform"
                  value="100ms"
                  checked={videoPlatform === '100ms'}
                  onChange={e => setVideoPlatform(e.target.value as VideoPlatform)}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '500' }}>Built-in Video</span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        background: 'var(--color-primary)',
                        color: '#fff',
                        borderRadius: '9999px',
                        fontWeight: '500',
                      }}
                    >
                      Recommended
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    Video conferencing built right into the platform. No setup needed!
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: `2px solid ${videoPlatform === 'none' ? 'var(--color-primary)' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background:
                    videoPlatform === 'none' ? 'var(--color-primary-light, #f0f9ff)' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="videoPlatform"
                  value="none"
                  checked={videoPlatform === 'none'}
                  onChange={e => setVideoPlatform(e.target.value as VideoPlatform)}
                  style={{ width: '18px', height: '18px' }}
                />
                <div>
                  <span style={{ fontWeight: '500' }}>Manual Links</span>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    You&apos;ll add meeting links manually for each session
                  </p>
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  border: `2px solid ${videoPlatform === 'google_meet' ? 'var(--color-primary)' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background:
                    videoPlatform === 'google_meet'
                      ? 'var(--color-primary-light, #f0f9ff)'
                      : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="videoPlatform"
                  value="google_meet"
                  checked={videoPlatform === 'google_meet'}
                  onChange={e => setVideoPlatform(e.target.value as VideoPlatform)}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '500' }}>Google Meet</span>
                    {integrationStatus.google.connected ? (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#dcfce7',
                          color: '#166534',
                          borderRadius: '9999px',
                          fontWeight: '500',
                        }}
                      >
                        Connected
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '9999px',
                          fontWeight: '500',
                        }}
                      >
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    {integrationStatus.google.connected
                      ? `Meet links will be auto-created (${integrationStatus.google.email})`
                      : 'Connect Google to auto-generate Meet links'}
                  </p>
                  {!integrationStatus.google.connected && (
                    <Link
                      href={`/srv/${expertId}/settings`}
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-primary)',
                        textDecoration: 'underline',
                        marginTop: '4px',
                        display: 'inline-block',
                      }}
                    >
                      Connect Google in Settings
                    </Link>
                  )}
                </div>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  border: `2px solid ${videoPlatform === 'zoom' ? 'var(--color-primary)' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background:
                    videoPlatform === 'zoom' ? 'var(--color-primary-light, #f0f9ff)' : '#fff',
                }}
              >
                <input
                  type="radio"
                  name="videoPlatform"
                  value="zoom"
                  checked={videoPlatform === 'zoom'}
                  onChange={e => setVideoPlatform(e.target.value as VideoPlatform)}
                  style={{ width: '18px', height: '18px', marginTop: '2px' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '500' }}>Zoom</span>
                    {integrationStatus.zoom.connected ? (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#dcfce7',
                          color: '#166534',
                          borderRadius: '9999px',
                          fontWeight: '500',
                        }}
                      >
                        Connected
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          background: '#fef3c7',
                          color: '#92400e',
                          borderRadius: '9999px',
                          fontWeight: '500',
                        }}
                      >
                        Not Connected
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                    {integrationStatus.zoom.connected
                      ? `Zoom meetings will be auto-created (${integrationStatus.zoom.email})`
                      : 'Connect Zoom to auto-generate meeting links'}
                  </p>
                  {!integrationStatus.zoom.connected && (
                    <Link
                      href={`/srv/${expertId}/settings`}
                      style={{
                        fontSize: '13px',
                        color: 'var(--color-primary)',
                        textDecoration: 'underline',
                        marginTop: '4px',
                        display: 'inline-block',
                      }}
                    >
                      Connect Zoom in Settings
                    </Link>
                  )}
                </div>
              </label>
            </div>
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
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Sessions</h2>
            <button
              type="button"
              onClick={addSession}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
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
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Session
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {sessions.map((session, idx) => (
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
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#6b7280',
                    }}
                  >
                    Session {idx + 1}
                  </span>
                  {sessions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSession(session.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '13px',
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      Title *
                    </label>
                    <input
                      type="text"
                      value={session.title}
                      onChange={e => updateSession(session.id, 'title', e.target.value)}
                      placeholder="Session title"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      Description
                    </label>
                    <input
                      type="text"
                      value={session.description}
                      onChange={e => updateSession(session.id, 'description', e.target.value)}
                      placeholder="What will be covered in this session"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                      Date *
                    </label>
                    <input
                      type="date"
                      value={session.date}
                      onChange={e => updateSession(session.id, 'date', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        Start Time
                      </label>
                      <input
                        type="time"
                        value={session.startTime}
                        onChange={e => updateSession(session.id, 'startTime', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>
                        End Time
                      </label>
                      <input
                        type="time"
                        value={session.endTime}
                        onChange={e => updateSession(session.id, 'endTime', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          fontSize: '14px',
                        }}
                      />
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: '8px',
                    fontSize: '12px',
                    color: '#9ca3af',
                  }}
                >
                  Duration: {session.duration} minutes
                </div>
              </div>
            ))}
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

        {/* Submit */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Link
            href={`/srv/${expertId}/webinars`}
            style={{
              padding: '12px 24px',
              background: '#f3f4f6',
              color: '#374151',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              textDecoration: 'none',
            }}
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={e => handleSubmit(e, false)}
            disabled={submitting || publishing}
            style={{
              padding: '12px 24px',
              background: '#fff',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: submitting || publishing ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Saving...' : 'Save as Draft'}
          </button>
          <button
            type="button"
            onClick={e => handleSubmit(e, true)}
            disabled={submitting || publishing}
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: submitting || publishing ? 'not-allowed' : 'pointer',
              opacity: publishing ? 0.7 : 1,
            }}
          >
            {publishing ? 'Publishing...' : 'Create & Publish'}
          </button>
        </div>
      </form>
    </div>
  );
}
