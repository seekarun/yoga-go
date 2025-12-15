'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import WebinarFeedbackForm from '@/components/webinar/WebinarFeedbackForm';
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
  }>;
}

function formatFullDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

function getSessionStatus(session: WebinarSession): 'upcoming' | 'live' | 'completed' {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}

function getTimeUntil(dateString: string): string {
  const now = new Date();
  const target = new Date(dateString);
  const diff = target.getTime() - now.getTime();

  if (diff <= 0) return 'Started';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function WebinarAccessPage({ params }: PageProps) {
  const { id: webinarId } = use(params);
  const { user } = useAuth();
  const [webinar, setWebinar] = useState<WebinarWithAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);

  useEffect(() => {
    const fetchWebinar = async () => {
      try {
        const response = await fetch(`/data/app/webinars/${webinarId}`);
        const data = await response.json();

        if (data.success) {
          setWebinar(data.data);
        } else {
          setError(data.error || 'Failed to load webinar');
        }
      } catch (err) {
        console.error('[DBG][webinar-access] Error:', err);
        setError('Failed to load webinar');
      } finally {
        setLoading(false);
      }
    };

    fetchWebinar();
  }, [webinarId]);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading webinar...</div>
        </div>
      </div>
    );
  }

  if (error || !webinar) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div
          style={{ maxWidth: '600px', margin: '0 auto', padding: '80px 20px', textAlign: 'center' }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Access Denied</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>
            {error || 'You do not have access to this webinar'}
          </p>
          <Link
            href="/webinars"
            style={{
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              display: 'inline-block',
            }}
          >
            Browse Webinars
          </Link>
        </div>
      </div>
    );
  }

  const imageUrl = webinar.coverImage || webinar.thumbnail || '/images/default-webinar.jpg';

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          padding: '40px 20px',
          color: '#fff',
        }}
      >
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <Link
            href="/app/webinars"
            style={{
              color: '#fff',
              textDecoration: 'none',
              fontSize: '14px',
              opacity: 0.9,
              display: 'inline-block',
              marginBottom: '20px',
            }}
          >
            &larr; Back to My Webinars
          </Link>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {webinar.category && (
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {webinar.category}
              </span>
            )}
            {webinar.level && (
              <span
                style={{
                  padding: '4px 12px',
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {webinar.level}
              </span>
            )}
          </div>

          <h1 style={{ fontSize: '36px', fontWeight: '600', marginBottom: '16px' }}>
            {webinar.title}
          </h1>

          {webinar.expert && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundImage: `url(${webinar.expert.avatar || '/images/default-avatar.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '2px solid #fff',
                }}
              />
              <div>
                <div style={{ fontWeight: '600' }}>{webinar.expert.name}</div>
                {webinar.expert.title && (
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>{webinar.expert.title}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px 20px' }}>
        {/* Registration Status */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', color: '#666' }}>Registration Status</div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--color-highlight)' }}>
              Registered
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '14px', color: '#666' }}>Registered on</div>
            <div style={{ fontSize: '16px', fontWeight: '500' }}>
              {new Date(webinar.registration.registeredAt).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Sessions */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '20px' }}>
            Your Sessions
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {webinar.sessions.map((session, index) => {
              const status = getSessionStatus(session);
              const isLive = status === 'live';
              const isCompleted = status === 'completed';
              const hasRecording =
                session.recordingCloudflareId && session.recordingStatus === 'ready';

              return (
                <div
                  key={session.id}
                  style={{
                    padding: '20px',
                    background: isLive ? '#fef2f2' : '#f8f9fa',
                    borderRadius: '12px',
                    border: isLive ? '2px solid #ef4444' : '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px',
                        }}
                      >
                        <span
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: isCompleted
                              ? 'var(--color-highlight)'
                              : 'var(--color-primary)',
                            color: '#fff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            fontWeight: '600',
                          }}
                        >
                          {isCompleted ? '✓' : index + 1}
                        </span>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                          {session.title}
                        </h3>
                        {isLive && (
                          <span
                            style={{
                              padding: '4px 10px',
                              background: '#ef4444',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                background: '#fff',
                                borderRadius: '50%',
                                animation: 'pulse 1.5s infinite',
                              }}
                            />
                            LIVE
                          </span>
                        )}
                      </div>

                      {session.description && (
                        <p style={{ color: '#666', marginBottom: '12px', fontSize: '14px' }}>
                          {session.description}
                        </p>
                      )}

                      <div
                        style={{ display: 'flex', gap: '24px', color: '#666', fontSize: '14px' }}
                      >
                        <div>
                          <strong>Date:</strong> {formatFullDate(session.startTime)}
                        </div>
                        <div>
                          <strong>Time:</strong> {formatTime(session.startTime)}
                        </div>
                        <div>
                          <strong>Duration:</strong> {session.duration} minutes
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                      {!isCompleted && (
                        <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>
                          {isLive
                            ? 'Happening now!'
                            : `Starts in ${getTimeUntil(session.startTime)}`}
                        </div>
                      )}

                      {isLive && session.googleMeetLink && (
                        <a
                          href={session.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-block',
                            padding: '12px 24px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '600',
                            fontSize: '14px',
                          }}
                        >
                          Join Now
                        </a>
                      )}

                      {!isLive && !isCompleted && session.googleMeetLink && (
                        <div
                          style={{
                            padding: '10px 16px',
                            background: '#e2e8f0',
                            borderRadius: '8px',
                            color: '#666',
                            fontSize: '13px',
                          }}
                        >
                          Link available at session time
                        </div>
                      )}

                      {isCompleted && hasRecording && (
                        <Link
                          href={`/app/webinars/${webinar.id}/recording/${session.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '10px 20px',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: '8px',
                            textDecoration: 'none',
                            fontWeight: '500',
                            fontSize: '14px',
                          }}
                        >
                          Watch Recording
                        </Link>
                      )}

                      {isCompleted && !hasRecording && (
                        <div
                          style={{
                            padding: '10px 16px',
                            background: '#f0f0f0',
                            borderRadius: '8px',
                            color: '#888',
                            fontSize: '13px',
                          }}
                        >
                          Recording coming soon
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Description */}
        {webinar.description && (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              About This Webinar
            </h2>
            <p style={{ color: '#444', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
              {webinar.description}
            </p>
          </div>
        )}

        {/* Feedback Section */}
        {webinar.status === 'COMPLETED' && !webinar.registration.feedbackSubmitted && (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              Share Your Feedback
            </h2>
            {showFeedbackForm ? (
              <WebinarFeedbackForm
                webinarId={webinarId}
                onSuccess={() => {
                  setShowFeedbackForm(false);
                  // Refresh webinar data
                  window.location.reload();
                }}
                onCancel={() => setShowFeedbackForm(false)}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <p style={{ color: '#666', marginBottom: '16px' }}>
                  How was your experience with this webinar? Your feedback helps the instructor
                  improve.
                </p>
                <button
                  onClick={() => setShowFeedbackForm(true)}
                  style={{
                    padding: '12px 24px',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  Write a Review
                </button>
              </div>
            )}
          </div>
        )}

        {/* Already submitted feedback */}
        {webinar.registration.feedbackSubmitted && (
          <div
            style={{
              background: '#f0fdf4',
              borderRadius: '12px',
              padding: '20px',
              marginTop: '24px',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '20px', marginRight: '8px' }}>Done!</span>
            <span style={{ color: '#166534' }}>Thank you for your feedback!</span>
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
