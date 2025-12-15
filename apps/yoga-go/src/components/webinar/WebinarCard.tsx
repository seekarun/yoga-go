import Link from 'next/link';
import type { Webinar, WebinarSession } from '@/types';

interface WebinarExpert {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
}

interface WebinarWithExpert extends Webinar {
  expert?: WebinarExpert;
}

interface WebinarCardProps {
  webinar: WebinarWithExpert;
  variant?: 'compact' | 'full';
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for display
 */
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get the next upcoming session from a webinar
 */
function getNextSession(sessions: WebinarSession[]): WebinarSession | null {
  const now = new Date().toISOString();
  const upcomingSessions = sessions
    .filter(s => s.startTime >= now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return upcomingSessions[0] || null;
}

/**
 * Check if a session is happening soon (within 24 hours)
 */
function isHappeningSoon(session: WebinarSession): boolean {
  const now = new Date();
  const sessionStart = new Date(session.startTime);
  const hoursUntil = (sessionStart.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntil > 0 && hoursUntil <= 24;
}

export default function WebinarCard({ webinar, variant = 'full' }: WebinarCardProps) {
  const isCompact = variant === 'compact';
  const imageUrl = webinar.coverImage || webinar.thumbnail || '/images/default-webinar.jpg';
  const expert = webinar.expert;

  const nextSession = getNextSession(webinar.sessions);
  const isSoon = nextSession && isHappeningSoon(nextSession);
  const isLive = webinar.status === 'LIVE';
  const isCompleted = webinar.status === 'COMPLETED';

  if (isCompact) {
    return (
      <Link
        href={`/webinars/${webinar.id}`}
        style={{
          textDecoration: 'none',
          color: 'inherit',
          minWidth: '320px',
          flex: '0 0 320px',
        }}
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
          {/* Image */}
          <div
            style={{
              height: '180px',
              backgroundImage: `url(${imageUrl})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              position: 'relative',
            }}
          >
            {/* Live Badge */}
            {isLive && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  padding: '4px 12px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    background: '#fff',
                    borderRadius: '50%',
                    animation: 'pulse 1.5s infinite',
                  }}
                />
                LIVE
              </span>
            )}
            {/* Happening Soon Badge */}
            {!isLive && isSoon && (
              <span
                style={{
                  position: 'absolute',
                  top: '12px',
                  left: '12px',
                  padding: '4px 12px',
                  background: 'var(--color-highlight)',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                STARTING SOON
              </span>
            )}
            {/* Sessions Count Badge */}
            <span
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '4px 12px',
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

          {/* Info */}
          <div style={{ padding: '20px' }}>
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
            {nextSession && !isCompleted && (
              <div
                style={{
                  fontSize: '13px',
                  color: '#666',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ color: 'var(--color-primary)' }}>&#128197;</span>
                {formatDate(nextSession.startTime)} at {formatTime(nextSession.startTime)}
              </div>
            )}

            {/* Expert Info */}
            {expert && (
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
                    backgroundImage: `url(${expert.avatar || '/images/default-avatar.jpg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#e2e8f0',
                  }}
                />
                <span style={{ fontSize: '13px', color: '#4a5568' }}>{expert.name}</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '12px',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {webinar.rating && webinar.rating > 0 ? (
                  <>
                    <span style={{ color: '#FFB800' }}>&#9733;</span>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{webinar.rating}</span>
                  </>
                ) : (
                  <span style={{ fontSize: '13px', color: '#999' }}>
                    {webinar.totalRegistrations} registered
                  </span>
                )}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-primary)' }}>
                {webinar.price === 0 ? 'Free' : `$${webinar.price}`}
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Full variant for webinars page grid
  return (
    <Link href={`/webinars/${webinar.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          transition: 'transform 0.2s, box-shadow 0.2s',
          cursor: 'pointer',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
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
            height: '200px',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            position: 'relative',
          }}
        >
          {/* Badges */}
          <div
            style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              display: 'flex',
              gap: '8px',
            }}
          >
            {isLive && (
              <span
                style={{
                  padding: '6px 12px',
                  background: '#ef4444',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    background: '#fff',
                    borderRadius: '50%',
                  }}
                />
                LIVE NOW
              </span>
            )}
            {!isLive && isSoon && (
              <span
                style={{
                  padding: '6px 12px',
                  background: 'var(--color-highlight)',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                STARTING SOON
              </span>
            )}
            {isCompleted && (
              <span
                style={{
                  padding: '6px 12px',
                  background: '#6b7280',
                  color: '#fff',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                COMPLETED
              </span>
            )}
          </div>

          {/* Sessions Count */}
          <span
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
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

        {/* Info */}
        <div
          style={{
            padding: '24px',
            flex: '1',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Category & Level */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {webinar.category && (
              <span
                style={{
                  padding: '4px 12px',
                  background: '#f7fafc',
                  borderRadius: '6px',
                  fontSize: '12px',
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
                  padding: '4px 12px',
                  background: '#f7fafc',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: '#4a5568',
                }}
              >
                {webinar.level}
              </span>
            )}
          </div>

          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '8px',
              lineHeight: '1.4',
            }}
          >
            {webinar.title}
          </h2>

          <p
            style={{
              fontSize: '14px',
              color: '#666',
              lineHeight: '1.6',
              marginBottom: '16px',
              flex: '1',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {webinar.description}
          </p>

          {/* Next Session */}
          {nextSession && !isCompleted && (
            <div
              style={{
                padding: '12px',
                background: '#f7fafc',
                borderRadius: '8px',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                Next Session
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                {formatDate(nextSession.startTime)} at {formatTime(nextSession.startTime)}
              </div>
            </div>
          )}

          {/* Expert */}
          {expert && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundImage: `url(${expert.avatar || '/images/default-avatar.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#e2e8f0',
                  border: '2px solid #fff',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                }}
              />
              <div>
                <div style={{ fontSize: '14px', color: '#333', fontWeight: '500' }}>
                  {expert.name}
                </div>
                {expert.title && (
                  <div style={{ fontSize: '12px', color: '#666' }}>{expert.title}</div>
                )}
              </div>
            </div>
          )}

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              paddingTop: '16px',
              borderTop: '1px solid #e2e8f0',
              marginBottom: '16px',
            }}
          >
            {webinar.rating && webinar.rating > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: '#FFB800' }}>&#9733;</span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>{webinar.rating}</span>
              </div>
            )}
            <div style={{ fontSize: '14px', color: '#666' }}>
              {webinar.totalRegistrations} registered
            </div>
            {webinar.maxParticipants && (
              <div style={{ fontSize: '14px', color: '#666' }}>
                {webinar.maxParticipants - webinar.totalRegistrations} spots left
              </div>
            )}
          </div>

          {/* Price */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--color-primary)' }}>
              {webinar.price === 0 ? 'Free' : `$${webinar.price}`}
            </div>
            <div
              style={{
                padding: '8px 16px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '600',
                transition: 'background 0.2s',
              }}
            >
              {isCompleted ? 'View Recording' : 'View Details'}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
