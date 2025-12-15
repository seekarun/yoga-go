'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getClientExpertContext } from '@/lib/domainContext';
import type { Webinar, WebinarRegistration, WebinarSession } from '@/types';

interface WebinarWithRegistration extends Webinar {
  registration: WebinarRegistration;
  expert?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
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

function getNextSession(sessions: WebinarSession[]): WebinarSession | null {
  const now = new Date().toISOString();
  const upcomingSessions = sessions
    .filter(s => s.startTime >= now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return upcomingSessions[0] || null;
}

function isHappeningSoon(session: WebinarSession): boolean {
  const now = new Date();
  const sessionStart = new Date(session.startTime);
  const hoursUntil = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil <= 24;
}

function isLiveNow(session: WebinarSession): boolean {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  return now >= start && now <= end;
}

export default function MyWebinars() {
  const { user } = useAuth();
  const [webinars, setWebinars] = useState<WebinarWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'live' | 'completed'>('all');
  const [expertMode, setExpertMode] = useState<{ isExpertMode: boolean; expertId: string | null }>({
    isExpertMode: false,
    expertId: null,
  });

  useEffect(() => {
    const context = getClientExpertContext();
    setExpertMode({
      isExpertMode: context.isExpertMode,
      expertId: context.expertId,
    });
  }, []);

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        const response = await fetch('/data/app/webinars');
        const data = await response.json();

        if (data.success) {
          setWebinars(data.data);
        }
      } catch (error) {
        console.error('[DBG][my-webinars] Error fetching webinars:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, []);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  // Filter by expert if on expert subdomain
  const allWebinars =
    expertMode.isExpertMode && expertMode.expertId
      ? webinars.filter(w => w.expertId === expertMode.expertId)
      : webinars;

  // Filter webinars
  const now = new Date().toISOString();
  const filteredWebinars = allWebinars.filter(webinar => {
    if (filter === 'all') return true;

    const hasLiveSession = webinar.sessions.some(s => isLiveNow(s));
    const hasUpcomingSession = webinar.sessions.some(s => s.startTime >= now);
    const allSessionsCompleted = webinar.sessions.every(s => s.endTime < now);

    if (filter === 'live') return hasLiveSession || webinar.status === 'LIVE';
    if (filter === 'upcoming') return hasUpcomingSession && !hasLiveSession;
    if (filter === 'completed') return allSessionsCompleted || webinar.status === 'COMPLETED';

    return true;
  });

  const getStatusBadge = (webinar: WebinarWithRegistration) => {
    const nextSession = getNextSession(webinar.sessions);

    if (webinar.status === 'LIVE' || (nextSession && isLiveNow(nextSession))) {
      return {
        text: 'LIVE NOW',
        color: '#ef4444',
        showPulse: true,
      };
    }

    if (nextSession && isHappeningSoon(nextSession)) {
      return {
        text: 'STARTING SOON',
        color: 'var(--color-highlight)',
        showPulse: false,
      };
    }

    if (webinar.status === 'COMPLETED') {
      return {
        text: 'COMPLETED',
        color: '#6b7280',
        showPulse: false,
      };
    }

    return {
      text: 'UPCOMING',
      color: 'var(--color-primary)',
      showPulse: false,
    };
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link
              href="/app"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              &larr; Back to Dashboard
            </Link>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>My Webinars</h1>
          <p style={{ fontSize: '16px', color: '#666' }}>
            Access your registered webinars and live sessions
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {(['all', 'live', 'upcoming', 'completed'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: '10px 20px',
                background: filter === f ? 'var(--color-primary)' : '#fff',
                color: filter === f ? '#fff' : '#333',
                border: filter === f ? 'none' : '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f === 'all' ? 'All Webinars' : f}
            </button>
          ))}
        </div>

        {/* Webinars Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading your webinars...</div>
          </div>
        ) : filteredWebinars.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredWebinars.map(webinar => {
              const nextSession = getNextSession(webinar.sessions);
              const badge = getStatusBadge(webinar);
              const imageUrl =
                webinar.coverImage || webinar.thumbnail || '/images/default-webinar.jpg';

              return (
                <Link
                  key={webinar.id}
                  href={`/app/webinars/${webinar.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      cursor: 'pointer',
                      height: '100%',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }}
                  >
                    {/* Cover Image */}
                    <div
                      style={{
                        height: '180px',
                        backgroundImage: `url(${imageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        position: 'relative',
                      }}
                    >
                      {/* Status Badge */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          left: '12px',
                          padding: '6px 12px',
                          background: badge.color,
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {badge.showPulse && (
                          <span
                            style={{
                              width: '8px',
                              height: '8px',
                              background: '#fff',
                              borderRadius: '50%',
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                        )}
                        {badge.text}
                      </span>

                      {/* Sessions Count */}
                      <span
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          padding: '6px 12px',
                          background: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {webinar.sessions.length} session{webinar.sessions.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '20px' }}>
                      {/* Category & Level */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        {webinar.category && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#f7fafc',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: 'var(--color-primary)',
                              fontWeight: '600',
                            }}
                          >
                            {webinar.category}
                          </span>
                        )}
                        {webinar.level && (
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#f7fafc',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#4a5568',
                            }}
                          >
                            {webinar.level}
                          </span>
                        )}
                      </div>

                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          lineHeight: '1.4',
                        }}
                      >
                        {webinar.title}
                      </h3>

                      {/* Next Session Info */}
                      {nextSession && (
                        <div
                          style={{
                            padding: '12px',
                            background: '#f7fafc',
                            borderRadius: '8px',
                            marginBottom: '12px',
                          }}
                        >
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                            Next Session
                          </div>
                          <div
                            style={{
                              fontSize: '14px',
                              fontWeight: '600',
                              color: 'var(--color-primary)',
                            }}
                          >
                            {formatDate(nextSession.startTime)} at{' '}
                            {formatTime(nextSession.startTime)}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                            {nextSession.title}
                          </div>
                        </div>
                      )}

                      {/* Expert Info */}
                      {webinar.expert && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundImage: `url(${webinar.expert.avatar || '/images/default-avatar.jpg'})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundColor: '#e2e8f0',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: '#4a5568' }}>
                            {webinar.expert.name}
                          </span>
                        </div>
                      )}

                      {/* Action Button */}
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '12px',
                          borderTop: '1px solid #e2e8f0',
                        }}
                      >
                        <span style={{ fontSize: '13px', color: '#666' }}>
                          Registered{' '}
                          {new Date(webinar.registration.registeredAt).toLocaleDateString()}
                        </span>
                        <div
                          style={{
                            padding: '8px 16px',
                            background:
                              badge.text === 'LIVE NOW' ? '#ef4444' : 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: '600',
                          }}
                        >
                          {badge.text === 'LIVE NOW'
                            ? 'Join Now'
                            : badge.text === 'COMPLETED'
                              ? 'View Recording'
                              : 'View Details'}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎥</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              No webinars found
            </h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              {filter !== 'all'
                ? 'Try changing your filter'
                : "You haven't registered for any webinars yet"}
            </p>
            <Link
              href="/webinars"
              style={{
                padding: '12px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Browse Webinars
            </Link>
          </div>
        )}
      </div>

      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
