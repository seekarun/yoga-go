'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import StudentVideoRoom from '@/components/StudentVideoRoom';
import type { LiveSession } from '@/types';

export default function InstantMeetingPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<LiveSession | null>(null);
  const [joined, setJoined] = useState(false);
  const [authToken, setAuthToken] = useState<string>('');

  useEffect(() => {
    fetchSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  const fetchSession = async () => {
    try {
      console.log('[DBG][instant-meeting] Fetching session for code:', code);
      const response = await fetch(`/api/live/sessions/instant/${code}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Meeting not found');
        setLoading(false);
        return;
      }

      setSession(data.data);
      setLoading(false);
    } catch (err) {
      console.error('[DBG][instant-meeting] Error fetching session:', err);
      setError('Failed to load meeting');
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    if (!session) return;

    try {
      console.log('[DBG][instant-meeting] Generating auth token for session:', session.id);
      const response = await fetch(`/api/live/sessions/${session.id}/join-token`, {
        method: 'POST',
      });

      const data = await response.json();
      if (!data.success) {
        setError(data.error || 'Failed to join meeting');
        return;
      }

      console.log('[DBG][instant-meeting] Auth token generated, joining room');
      setAuthToken(data.data.token);
      setJoined(true);
    } catch (err) {
      console.error('[DBG][instant-meeting] Error joining meeting:', err);
      setError('Failed to join meeting');
    }
  };

  const handleLeave = () => {
    setJoined(false);
    setAuthToken('');
    router.push('/app/live');
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p style={{ marginTop: '16px', color: '#718096' }}>Loading meeting...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            padding: '40px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
          <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
            Meeting Not Found
          </h2>
          <p style={{ color: '#718096', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => router.push('/app/live')}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            Browse Live Sessions
          </button>
        </div>
      </div>
    );
  }

  if (joined && session && authToken) {
    return (
      <HMSRoomProvider>
        <StudentVideoRoom sessionId={session.id} authToken={authToken} onLeave={handleLeave} />
      </HMSRoomProvider>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          width: '100%',
          padding: '40px',
          background: '#fff',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎥</div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            {session?.title}
          </h1>
          <p style={{ fontSize: '16px', color: '#718096', marginBottom: '16px' }}>
            {session?.description}
          </p>
          <div
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: '#f0f4ff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#667eea',
            }}
          >
            Meeting Code: <span style={{ fontFamily: 'monospace' }}>{code}</span>
          </div>
        </div>

        {session?.expertName && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              background: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '24px',
            }}
          >
            {session.expertAvatar && (
              <img
                src={session.expertAvatar}
                alt={session.expertName}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                }}
              />
            )}
            <div>
              <div style={{ fontSize: '14px', color: '#9ca3af' }}>Hosted by</div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>{session.expertName}</div>
            </div>
          </div>
        )}

        <div
          style={{
            padding: '20px',
            background: '#fffbeb',
            border: '1px solid #fbbf24',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
            Before you join:
          </div>
          <ul style={{ fontSize: '14px', color: '#92400e', paddingLeft: '20px', margin: 0 }}>
            <li>Allow camera and microphone access</li>
            <li>Use headphones for better audio quality</li>
            <li>Find a quiet place with good lighting</li>
          </ul>
        </div>

        <button
          onClick={handleJoin}
          style={{
            width: '100%',
            padding: '16px',
            background: '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            fontSize: '18px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
          }}
        >
          Join Meeting
        </button>

        <div
          style={{
            marginTop: '16px',
            textAlign: 'center',
            fontSize: '14px',
            color: '#9ca3af',
          }}
        >
          {session?.currentViewers || 0} participant{session?.currentViewers === 1 ? '' : 's'}{' '}
          currently in the meeting
        </div>
      </div>
    </div>
  );
}
