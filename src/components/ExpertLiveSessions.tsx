'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LiveSessionCard from './LiveSessionCard';
import type { LiveSession, ApiResponse } from '@/types';

interface ExpertLiveSessionsProps {
  expertId: string;
}

export default function ExpertLiveSessions({ expertId }: ExpertLiveSessionsProps) {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'live' | 'ended'>('all');

  useEffect(() => {
    fetchSessions();
  }, [expertId, filter]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ expertId });
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/live/sessions?${params.toString()}`);
      const data: ApiResponse<LiveSession[]> = await response.json();

      if (data.success && data.data) {
        setSessions(data.data);
      }
    } catch (error) {
      console.error('[DBG][ExpertLiveSessions] Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/live/sessions/${sessionId}/start`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        // Navigate to expert video room
        window.open(`/app/live/host/${sessionId}`, '_blank');
        // Refresh session list
        fetchSessions();
      } else {
        alert(data.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('[DBG][ExpertLiveSessions] Error starting session:', error);
      alert('Failed to start session');
    }
  };

  const handleEndSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to end this session?')) return;

    try {
      const response = await fetch(`/api/live/sessions/${sessionId}/end`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        alert('Session ended successfully');
        fetchSessions(); // Refresh list
      } else {
        alert(data.error || 'Failed to end session');
      }
    } catch (error) {
      console.error('[DBG][ExpertLiveSessions] Error ending session:', error);
      alert('Failed to end session');
    }
  };

  const filteredSessions = sessions.filter(session => {
    if (filter === 'all') return true;
    return session.status === filter;
  });

  return (
    <div style={{ padding: '40px 20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '700',
                color: '#2d3748',
                marginBottom: '8px',
              }}
            >
              Live Sessions
            </h2>
            <p style={{ fontSize: '16px', color: '#718096' }}>
              Manage your scheduled and live streaming sessions
            </p>
          </div>

          <Link
            href={`/srv/${expertId}/live/create`}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Create Session
          </Link>
        </div>

        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '24px',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {(['all', 'scheduled', 'live', 'ended'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                borderBottom: filter === tab ? '3px solid #667eea' : '3px solid transparent',
                color: filter === tab ? '#667eea' : '#718096',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s',
              }}
            >
              {tab}
              <span
                style={{
                  marginLeft: '8px',
                  padding: '2px 8px',
                  background: filter === tab ? '#667eea' : '#e2e8f0',
                  color: filter === tab ? '#fff' : '#718096',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              >
                {tab === 'all' ? sessions.length : sessions.filter(s => s.status === tab).length}
              </span>
            </button>
          ))}
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: '#a0aec0',
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '4px solid #e2e8f0',
                borderTop: '4px solid #667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px',
              }}
            />
            <div>Loading sessions...</div>
          </div>
        ) : filteredSessions.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
            <h3
              style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '8px',
              }}
            >
              No {filter !== 'all' ? filter : ''} sessions yet
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: '#718096',
                marginBottom: '24px',
              }}
            >
              Create your first live session to connect with your students in real-time
            </p>
            <Link
              href={`/srv/${expertId}/live/create`}
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Create Session
            </Link>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredSessions.map(session => (
              <LiveSessionCard
                key={session.id}
                session={session}
                variant="expert"
                onStart={handleStartSession}
                onEnd={handleEndSession}
              />
            ))}
          </div>
        )}

        {/* Info Box */}
        {!loading && sessions.length > 0 && (
          <div
            style={{
              marginTop: '40px',
              padding: '20px',
              background: '#f7fafc',
              borderLeft: '4px solid #667eea',
              borderRadius: '8px',
            }}
          >
            <h4
              style={{
                margin: '0 0 8px 0',
                fontSize: '16px',
                fontWeight: '600',
                color: '#2d3748',
              }}
            >
              💡 Live Streaming Tips
            </h4>
            <ul
              style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '14px',
                color: '#4a5568',
                lineHeight: '1.8',
              }}
            >
              <li>Test your stream before going live with students</li>
              <li>Use OBS Studio for the best streaming experience</li>
              <li>Ensure you have a stable internet connection (min 5 Mbps upload)</li>
              <li>Engage with students using the live chat feature</li>
              <li>
                Sessions are automatically recorded and can be made available to students later
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
