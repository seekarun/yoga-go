'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LiveSessionCard from './LiveSessionCard';
import type { LiveSession, ApiResponse } from '@/types';

interface StudentLiveSessionsProps {
  userId?: string; // Optional: filter by enrolled sessions
}

export default function StudentLiveSessions({ userId }: StudentLiveSessionsProps) {
  const router = useRouter();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming'>('all');

  useEffect(() => {
    fetchSessions();
  }, []); // Only fetch once on mount, filter is done client-side

  const fetchSessions = async () => {
    try {
      setLoading(true);
      // Fetch only user's enrolled sessions (my bookings)
      const response = await fetch('/api/app/live/my-sessions');
      const data: ApiResponse<LiveSession[]> = await response.json();

      if (data.success && data.data) {
        // Sort sessions: live first, then upcoming, then by scheduled time
        const sorted = data.data.sort((a, b) => {
          if (a.status === 'live' && b.status !== 'live') return -1;
          if (a.status !== 'live' && b.status === 'live') return 1;
          return (
            new Date(a.scheduledStartTime).getTime() - new Date(b.scheduledStartTime).getTime()
          );
        });
        setSessions(sorted);
      }
    } catch (error) {
      console.error('[DBG][StudentLiveSessions] Error fetching my sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter to only show active sessions (exclude ended, cancelled)
  const activeSessions = sessions.filter(s => s.status === 'live' || s.status === 'scheduled');
  const liveSessions = activeSessions.filter(s => s.status === 'live');
  const upcomingSessions = activeSessions.filter(s => s.status === 'scheduled');

  return (
    <div>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '32px',
            borderBottom: '1px solid #e2e8f0',
            background: '#fff',
            padding: '0 20px',
            borderRadius: '12px 12px 0 0',
          }}
        >
          {(['all', 'live', 'upcoming'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '16px 24px',
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
                {tab === 'all'
                  ? activeSessions.length
                  : tab === 'live'
                    ? liveSessions.length
                    : upcomingSessions.length}
              </span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
            <div style={{ color: '#a0aec0' }}>Loading sessions...</div>
          </div>
        ) : activeSessions.length === 0 ? (
          /* Empty State */
          <div
            style={{
              textAlign: 'center',
              padding: '80px 20px',
              background: '#fff',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📅</div>
            <h3
              style={{
                fontSize: '24px',
                fontWeight: '600',
                color: '#2d3748',
                marginBottom: '8px',
              }}
            >
              No Sessions Booked Yet
            </h3>
            <p
              style={{
                fontSize: '16px',
                color: '#718096',
                marginBottom: '32px',
              }}
            >
              Book your first private session with a yoga expert
            </p>

            <div
              style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}
            >
              <button
                onClick={() => router.push('/experts')}
                style={{
                  padding: '12px 32px',
                  background: '#667eea',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                }}
              >
                Browse Experts
              </button>

              <button
                onClick={() => router.push('/app')}
                style={{
                  padding: '12px 32px',
                  background: '#fff',
                  color: '#667eea',
                  border: '2px solid #667eea',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background 0.2s, color 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f7fafc';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Live Now Section */}
            {liveSessions.length > 0 && (filter === 'all' || filter === 'live') && (
              <div style={{ marginBottom: '48px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '24px',
                  }}
                >
                  <h2
                    style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#2d3748',
                      margin: 0,
                    }}
                  >
                    🔴 Live Now
                  </h2>
                  <div
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: '#f56565',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {liveSessions.map(session => (
                    <LiveSessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Sessions */}
            {upcomingSessions.length > 0 && (filter === 'all' || filter === 'upcoming') && (
              <div>
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#2d3748',
                    marginBottom: '24px',
                  }}
                >
                  📅 Upcoming Sessions
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {upcomingSessions.map(session => (
                    <LiveSessionCard key={session.id} session={session} />
                  ))}
                </div>
              </div>
            )}

            {/* Call-to-Action: Browse More Experts */}
            {activeSessions.length > 0 && (
              <div
                style={{
                  marginTop: '48px',
                  padding: '32px 24px',
                  background: '#f7fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧘‍♀️</div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#2d3748',
                    marginBottom: '8px',
                  }}
                >
                  Want to book another session?
                </h3>
                <p
                  style={{
                    fontSize: '16px',
                    color: '#718096',
                    marginBottom: '24px',
                    maxWidth: '500px',
                    margin: '0 auto 24px',
                  }}
                >
                  Browse our expert instructors and schedule your next 1-on-1 session
                </p>
                <button
                  onClick={() => router.push('/experts')}
                  style={{
                    padding: '12px 32px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                  }}
                >
                  Browse Experts
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
