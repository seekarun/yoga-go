import Link from 'next/link';
import type { LiveSession } from '@/types';

interface LiveSessionCardProps {
  session: LiveSession;
  variant?: 'default' | 'compact' | 'expert';
  onEnroll?: (sessionId: string) => void;
  onStart?: (sessionId: string) => void;
  onEnd?: (sessionId: string) => void;
}

export default function LiveSessionCard({
  session,
  variant = 'default',
  onEnroll,
  onStart,
  onEnd,
}: LiveSessionCardProps) {
  const isExpertView = variant === 'expert';
  const isCompact = variant === 'compact';

  // Format date and time
  const startDate = new Date(session.scheduledStartTime);
  const endDate = new Date(session.scheduledEndTime);
  const now = new Date();

  const isUpcoming = startDate > now;
  const isLive = session.status === 'live';
  const isEnded = session.status === 'ended';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getDuration = () => {
    const diff = endDate.getTime() - startDate.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Status badge
  const getStatusBadge = () => {
    if (isLive) {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: '#f56565',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#fff',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#fff',
              animation: 'pulse 2s infinite',
            }}
          />
          LIVE
        </div>
      );
    }
    if (isEnded) {
      return (
        <span
          style={{
            padding: '6px 12px',
            background: '#718096',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#fff',
          }}
        >
          Ended
        </span>
      );
    }
    if (isUpcoming) {
      return (
        <span
          style={{
            padding: '6px 12px',
            background: '#4299e1',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
            color: '#fff',
          }}
        >
          Upcoming
        </span>
      );
    }
    return null;
  };

  const sessionTypeColor = {
    '1-on-1': '#805ad5',
    group: '#48bb78',
    instant: '#3b82f6',
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'pointer',
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
      {/* Thumbnail with Status Badge */}
      <div
        style={{
          height: isCompact ? '120px' : '180px',
          backgroundImage: `url(${session.thumbnail || '/images/live-session-default.jpg'})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          position: 'relative',
        }}
      >
        {/* Overlay gradient */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.7))',
          }}
        />

        {/* Status Badge */}
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
          }}
        >
          {getStatusBadge()}
        </div>

        {/* Session Type */}
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
          }}
        >
          <span
            style={{
              padding: '4px 10px',
              background: sessionTypeColor[session.sessionType],
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              color: '#fff',
              textTransform: 'uppercase',
            }}
          >
            {session.sessionType}
          </span>
        </div>
      </div>

      {/* Session Info */}
      <div style={{ padding: isCompact ? '16px' : '20px' }}>
        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px 0',
            fontSize: isCompact ? '16px' : '18px',
            fontWeight: '600',
            color: '#2d3748',
            lineHeight: '1.4',
          }}
        >
          {session.title}
        </h3>

        {/* Description */}
        {!isCompact && (
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: '#718096',
              lineHeight: '1.6',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {session.description}
          </p>
        )}

        {/* Expert Info */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          {session.expertAvatar && (
            <img
              src={session.expertAvatar}
              alt={session.expertName}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
          )}
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: '600',
                color: '#2d3748',
              }}
            >
              {session.expertName}
            </div>
            {session.metadata?.category && (
              <div
                style={{
                  fontSize: '11px',
                  color: '#718096',
                }}
              >
                {session.metadata.category}
              </div>
            )}
          </div>
        </div>

        {/* Session Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            color: '#718096',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📅</span>
            <span>{formatDate(startDate)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🕐</span>
            <span>
              {formatTime(startDate)} - {formatTime(endDate)} ({getDuration()})
            </span>
          </div>
          {!isExpertView && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span>
              <span>
                {session.enrolledCount} enrolled
                {session.maxParticipants && ` / ${session.maxParticipants} max`}
              </span>
            </div>
          )}
          {/* Scheduled By - Show for expert view on 1-on-1 sessions */}
          {isExpertView && session.scheduledByName && session.scheduledByRole === 'student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span>
              <span>Booked by: {session.scheduledByName}</span>
            </div>
          )}
        </div>

        {/* Price & CTA */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {/* Price */}
          <div>
            {session.isFree ? (
              <span
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: '#48bb78',
                }}
              >
                FREE
              </span>
            ) : (
              <div>
                <span
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#2d3748',
                  }}
                >
                  ₹{session.price}
                </span>
                <span
                  style={{
                    fontSize: '12px',
                    color: '#718096',
                    marginLeft: '4px',
                  }}
                >
                  {session.currency || 'INR'}
                </span>
              </div>
            )}
          </div>

          {/* Action Button */}
          <div>
            {isExpertView ? (
              <div style={{ display: 'flex', gap: '8px' }}>
                {session.status === 'scheduled' && onStart && (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      onStart(session.id);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#48bb78',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#38a169';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#48bb78';
                    }}
                  >
                    Start
                  </button>
                )}
                {session.status === 'live' && onEnd && (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      onEnd(session.id);
                    }}
                    style={{
                      padding: '10px 20px',
                      background: '#f56565',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#e53e3e';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#f56565';
                    }}
                  >
                    End Session
                  </button>
                )}
              </div>
            ) : (
              <>
                {isLive && (
                  <Link
                    href={
                      session.sessionType === 'instant' && session.instantMeetingCode
                        ? `/app/live/instant/${session.instantMeetingCode}`
                        : `/app/live/join/${session.id}`
                    }
                    style={{ textDecoration: 'none' }}
                  >
                    <button
                      style={{
                        padding: '10px 24px',
                        background: '#f56565',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#e53e3e';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#f56565';
                      }}
                    >
                      Join Now
                    </button>
                  </Link>
                )}
                {session.status === 'scheduled' && onEnroll && (
                  <button
                    onClick={e => {
                      e.preventDefault();
                      onEnroll(session.id);
                    }}
                    style={{
                      padding: '10px 24px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    Enroll
                  </button>
                )}
                {isEnded && session.recordingAvailable && (
                  <Link
                    href={`/app/lessons/${session.recordedLessonId}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <button
                      style={{
                        padding: '10px 24px',
                        background: '#718096',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#4a5568';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = '#718096';
                      }}
                    >
                      Watch Recording
                    </button>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Pulse animation for LIVE badge */}
      <style jsx>{`
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
