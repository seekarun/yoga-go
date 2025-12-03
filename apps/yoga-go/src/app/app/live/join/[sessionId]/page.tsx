'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { LiveSession } from '@/types';

export default function JoinScheduledSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`/api/live/sessions/${sessionId}`);
        const data = await response.json();

        if (data.success) {
          setSession(data.data);
        } else {
          setError(data.error || 'Failed to load session');
        }
      } catch (err) {
        console.error('[DBG][JoinScheduledSessionPage] Error fetching session:', err);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, [sessionId]);

  const handleJoinMeeting = () => {
    if (!session?.meetingLink) {
      setError('Meeting link not available');
      return;
    }

    // Open meeting link in new tab
    window.open(session.meetingLink, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div
        style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}
      >
        <p style={{ fontSize: '18px', color: '#718096' }}>Loading session...</p>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <div
          style={{
            padding: '16px',
            background: '#fee',
            border: '1px solid #fcc',
            borderRadius: '8px',
            color: '#c33',
            marginBottom: '20px',
          }}
        >
          {error || 'Session not found'}
        </div>
        <button
          onClick={() => router.push('/app')}
          style={{
            padding: '12px 24px',
            background: '#667eea',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  const isLive = session.status === 'live';
  const isScheduled = session.status === 'scheduled';
  const isEnded = session.status === 'ended';

  const getPlatformIcon = () => {
    switch (session.meetingPlatform) {
      case 'zoom':
        return '📹';
      case 'google-meet':
        return '🎥';
      default:
        return '💻';
    }
  };

  const getPlatformName = () => {
    switch (session.meetingPlatform) {
      case 'zoom':
        return 'Zoom';
      case 'google-meet':
        return 'Google Meet';
      default:
        return 'Video Meeting';
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      {/* Session Header */}
      <div
        style={{
          background: '#fff',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <img
            src={session.expertAvatar || '/default-avatar.png'}
            alt={session.expertName}
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
          />
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '4px' }}>
              {session.title}
            </h1>
            <p style={{ color: '#718096', fontSize: '16px' }}>with {session.expertName}</p>
          </div>
        </div>

        <p style={{ color: '#4a5568', fontSize: '16px', lineHeight: '1.6', marginBottom: '24px' }}>
          {session.description}
        </p>

        {/* Session Info */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            marginBottom: '24px',
            padding: '16px',
            background: '#f7fafc',
            borderRadius: '8px',
          }}
        >
          <div>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Session Type</p>
            <p style={{ fontSize: '16px', fontWeight: '600', textTransform: 'capitalize' }}>
              {session.sessionType}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Platform</p>
            <p style={{ fontSize: '16px', fontWeight: '600' }}>
              {getPlatformIcon()} {getPlatformName()}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
              Scheduled Start
            </p>
            <p style={{ fontSize: '16px', fontWeight: '600' }}>
              {formatDateTime(session.scheduledStartTime)}
            </p>
          </div>
          <div>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>Scheduled End</p>
            <p style={{ fontSize: '16px', fontWeight: '600' }}>
              {formatDateTime(session.scheduledEndTime)}
            </p>
          </div>
        </div>

        {/* Status Badge */}
        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              background: isLive ? '#48bb78' : isScheduled ? '#ed8936' : '#cbd5e0',
              color: '#fff',
            }}
          >
            {isLive && '🔴 Live Now'}
            {isScheduled && '📅 Scheduled'}
            {isEnded && '✅ Ended'}
          </div>
        </div>

        {/* Join Meeting Button */}
        {isLive && session.meetingLink && (
          <button
            onClick={handleJoinMeeting}
            style={{
              width: '100%',
              padding: '16px',
              background: '#48bb78',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#38a169';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#48bb78';
            }}
          >
            Join {getPlatformName()} Meeting
          </button>
        )}

        {/* Waiting Message */}
        {isScheduled && (
          <div
            style={{
              padding: '16px',
              background: '#fef5e7',
              border: '1px solid #f9e79f',
              borderRadius: '8px',
              color: '#7d6608',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>
              ⏰ Session starts at {formatDateTime(session.scheduledStartTime)}
            </p>
            <p style={{ fontSize: '14px' }}>
              The meeting link will be available when the expert starts the session. Check back
              closer to the start time.
            </p>
          </div>
        )}

        {/* Ended Message */}
        {isEnded && (
          <div
            style={{
              padding: '16px',
              background: '#e8f4fd',
              border: '1px solid #b3d9f2',
              borderRadius: '8px',
              color: '#1e4d7b',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '8px' }}>This session has ended</p>
            <p style={{ fontSize: '14px' }}>
              Ended at {formatDateTime(session.actualEndTime || session.scheduledEndTime)}
            </p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <button
        onClick={() => router.push('/app')}
        style={{
          padding: '12px 24px',
          background: '#f7fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
        }}
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}
