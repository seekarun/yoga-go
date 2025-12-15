'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Webinar, WebinarRegistration, WebinarSession } from '@/types';

interface WebinarWithAccess extends Webinar {
  registration: WebinarRegistration;
  expert?: {
    id: string;
    name: string;
    title?: string;
    avatar?: string;
  };
}

interface PageProps {
  params: Promise<{
    id: string;
    sessionId: string;
  }>;
}

export default function RecordingPlaybackPage({ params }: PageProps) {
  const { id: webinarId, sessionId } = use(params);
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<WebinarWithAccess | null>(null);
  const [session, setSession] = useState<WebinarSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWebinar = async () => {
      try {
        const response = await fetch(`/data/app/webinars/${webinarId}`);
        const data = await response.json();

        if (data.success) {
          setWebinar(data.data);

          // Find the specific session
          const targetSession = data.data.sessions?.find((s: WebinarSession) => s.id === sessionId);

          if (targetSession) {
            setSession(targetSession);
          } else {
            setError('Session not found');
          }
        } else {
          setError(data.error || 'Failed to load webinar');
        }
      } catch (err) {
        console.error('[DBG][recording-playback] Error:', err);
        setError('Failed to load recording');
      } finally {
        setLoading(false);
      }
    };

    fetchWebinar();
  }, [webinarId, sessionId]);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '16px' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '16px' }}>Loading recording...</div>
        </div>
      </div>
    );
  }

  if (error || !webinar || !session) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <div
          style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff' }}>
            Recording Not Available
          </h2>
          <p style={{ color: '#999', marginBottom: '24px' }}>
            {error || 'This recording is not available'}
          </p>
          <Link
            href={`/app/webinars/${webinarId}`}
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to Webinar
          </Link>
        </div>
      </div>
    );
  }

  // Check if recording is available
  if (!session.recordingCloudflareId || session.recordingStatus !== 'ready') {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
        <div
          style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎬</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff' }}>
            Recording Processing
          </h2>
          <p style={{ color: '#999', marginBottom: '24px' }}>
            The recording for this session is still being processed. Please check back later.
          </p>
          <Link
            href={`/app/webinars/${webinarId}`}
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Back to Webinar
          </Link>
        </div>
      </div>
    );
  }

  // Cloudflare Stream embed URL
  const streamUrl = `https://iframe.videodelivery.net/${session.recordingCloudflareId}`;

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#000' }}>
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)',
          padding: '20px',
          position: 'absolute',
          top: '64px',
          left: 0,
          right: 0,
          zIndex: 10,
        }}
      >
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <Link
            href={`/app/webinars/${webinarId}`}
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              opacity: 0.9,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            &larr; Back to {webinar.title}
          </Link>
        </div>
      </div>

      {/* Video Player */}
      <div
        style={{
          width: '100%',
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#000',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '1400px',
              aspectRatio: '16/9',
              maxHeight: 'calc(100vh - 200px)',
            }}
          >
            <iframe
              src={streamUrl}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>

        {/* Session Info */}
        <div
          style={{
            background: '#111',
            padding: '20px',
            borderTop: '1px solid #333',
          }}
        >
          <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '600', color: '#fff', marginBottom: '8px' }}>
              {session.title}
            </h1>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
              <span style={{ color: '#999', fontSize: '14px' }}>
                From: <span style={{ color: '#fff' }}>{webinar.title}</span>
              </span>
              {webinar.expert && (
                <span style={{ color: '#999', fontSize: '14px' }}>
                  By: <span style={{ color: '#fff' }}>{webinar.expert.name}</span>
                </span>
              )}
              <span style={{ color: '#999', fontSize: '14px' }}>
                Duration: <span style={{ color: '#fff' }}>{session.duration} minutes</span>
              </span>
            </div>
            {session.description && (
              <p
                style={{
                  color: '#999',
                  marginTop: '16px',
                  fontSize: '14px',
                  lineHeight: '1.6',
                }}
              >
                {session.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
