'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useExpert } from '@/contexts/ExpertContext';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from '@/components/payment/PaymentModal';
import NotificationOverlay from '@/components/NotificationOverlay';
import type { Webinar, WebinarSession } from '@/types';

interface WebinarExpert {
  id: string;
  name: string;
  title?: string;
  bio?: string;
  avatar?: string;
  rating?: number;
  totalCourses?: number;
  totalStudents?: number;
  specializations?: string[];
}

interface WebinarWithExpert extends Webinar {
  expert?: WebinarExpert;
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
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
 * Get session status
 */
function getSessionStatus(session: WebinarSession): 'upcoming' | 'live' | 'completed' {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}

export default function ExpertWebinarDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { expert, expertId, loading: expertLoading, error: expertError } = useExpert();
  const { isAuthenticated } = useAuth();
  const webinarId = params.webinarId as string;

  const [webinar, setWebinar] = useState<WebinarWithExpert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  const fetchWebinarData = useCallback(async () => {
    if (!webinarId) return;

    try {
      console.log('[DBG][expert-webinar-detail] Fetching webinar:', webinarId);

      const response = await fetch(`/data/webinars/${webinarId}`);
      const data = await response.json();

      if (data.success) {
        setWebinar(data.data);
        console.log('[DBG][expert-webinar-detail] Webinar loaded:', data.data);
      } else {
        console.error('[DBG][expert-webinar-detail] Failed to load webinar:', data.error);
      }
    } catch (error) {
      console.error('[DBG][expert-webinar-detail] Error fetching webinar:', error);
    } finally {
      setLoading(false);
    }
  }, [webinarId]);

  useEffect(() => {
    fetchWebinarData();
  }, [fetchWebinarData]);

  // Check registration status
  useEffect(() => {
    const checkRegistration = async () => {
      if (!isAuthenticated || !webinarId) {
        setIsRegistered(false);
        return;
      }

      try {
        const response = await fetch(`/data/app/webinars/${webinarId}`);
        const data = await response.json();

        if (data.success) {
          setIsRegistered(true);
        }
      } catch (_error) {
        console.log('[DBG][expert-webinar-detail] Not registered for this webinar');
        setIsRegistered(false);
      }
    };

    checkRegistration();
  }, [isAuthenticated, webinarId]);

  const handleRegisterClick = async () => {
    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    if (isRegistered) {
      router.push(`/app/webinars/${webinarId}`);
      return;
    }

    if (!webinar) return;

    // Free webinar - register directly
    if (webinar.price === 0) {
      setRegisterLoading(true);
      try {
        const response = await fetch(`/data/app/webinars/${webinarId}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();

        if (data.success) {
          console.log('[DBG][expert-webinar-detail] Registration successful');
          setIsRegistered(true);
          router.push(`/app/webinars/${webinarId}`);
        } else {
          console.error('[DBG][expert-webinar-detail] Registration failed:', data.error);
          setNotification({
            message: data.error || 'Registration failed. Please try again.',
            type: 'error',
          });
        }
      } catch (error) {
        console.error('[DBG][expert-webinar-detail] Registration error:', error);
        setNotification({ message: 'Registration failed. Please try again.', type: 'error' });
      } finally {
        setRegisterLoading(false);
      }
      return;
    }

    // Paid webinar - open payment modal
    setShowPaymentModal(true);
  };

  // Show loading while expert or webinar are loading
  if (expertLoading || loading) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  // Expert not found
  if (expertError || !expert) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Expert not found</h2>
          <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  if (!webinar) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Live session not found</h2>
          <Link
            href="/webinars"
            style={{
              color: 'var(--color-primary)',
              textDecoration: 'underline',
            }}
          >
            View all live sessions
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = webinar.status === 'COMPLETED';
  const isLive = webinar.status === 'LIVE';
  const nextSession = webinar.sessions.find(
    s => getSessionStatus(s) === 'upcoming' || getSessionStatus(s) === 'live'
  );

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Hero Section */}
      <section
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 60px' }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
            <Link
              href="/webinars"
              style={{ color: 'var(--color-primary)', textDecoration: 'none' }}
            >
              Live Sessions
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>{webinar.title}</span>
          </div>

          <div>
            {/* Badges */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
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

            <h1
              style={{
                fontSize: '42px',
                fontWeight: '600',
                marginBottom: '24px',
                lineHeight: '1.2',
              }}
            >
              {webinar.title}
            </h1>

            {/* Expert */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundImage: `url(${expert.avatar || '/images/default-avatar.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              />
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600' }}>{expert.name}</div>
                {expert.title && (
                  <div style={{ fontSize: '14px', color: '#666' }}>{expert.title}</div>
                )}
              </div>
            </div>

            {/* Stats with Register Button */}
            <div
              style={{
                display: 'flex',
                gap: '24px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '16px', color: '#666' }}>
                {webinar.totalRegistrations || 0} registered
              </div>
              <div style={{ fontSize: '16px', color: '#666' }}>
                {webinar.sessions.length} session{webinar.sessions.length !== 1 ? 's' : ''}
              </div>
              {webinar.maxParticipants && (
                <div style={{ fontSize: '16px', color: '#666' }}>
                  {Math.max(0, webinar.maxParticipants - (webinar.totalRegistrations || 0))} spots
                  left
                </div>
              )}

              <button
                onClick={handleRegisterClick}
                disabled={(isCompleted && !isRegistered) || registerLoading}
                style={{
                  padding: '12px 24px',
                  background: isRegistered
                    ? 'var(--color-highlight)'
                    : isCompleted
                      ? '#6b7280'
                      : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor:
                    (isCompleted && !isRegistered) || registerLoading ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  marginLeft: 'auto',
                  opacity: registerLoading ? 0.7 : 1,
                }}
              >
                {registerLoading
                  ? 'Registering...'
                  : isRegistered
                    ? 'Access Webinar'
                    : isCompleted
                      ? 'Registration Closed'
                      : webinar.price === 0
                        ? 'Register Free'
                        : `Register - $${webinar.price}`}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Video Section */}
      {webinar.promoVideoCloudflareId && (
        <section
          style={{
            background: '#1a202c',
            borderBottom: '1px solid #e2e8f0',
            padding: '40px 0',
          }}
        >
          <div
            className="container"
            style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}
          >
            <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
              <iframe
                src={`https://customer-iq7mgkvtb3bwxqf5.cloudflarestream.com/${webinar.promoVideoCloudflareId}/iframe?preload=true&poster=https%3A%2F%2Fcustomer-iq7mgkvtb3bwxqf5.cloudflarestream.com%2F${webinar.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D0s%26height%3D600`}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px',
                  border: 'none',
                }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen
                title={`${webinar.title} - Promo Video`}
              />
            </div>
          </div>
        </section>
      )}

      {/* Description Section */}
      <section
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '40px 0',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}
        >
          <p
            style={{
              fontSize: '18px',
              color: '#4a5568',
              lineHeight: '1.8',
              textAlign: 'center',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            {webinar.description}
          </p>
        </div>
      </section>

      <div
        className="container"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
      >
        {/* Sessions List */}
        <section
          style={{
            background: '#fff',
            padding: '32px',
            borderRadius: '12px',
            marginBottom: '32px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{
              fontSize: '24px',
              fontWeight: '600',
              marginBottom: '24px',
            }}
          >
            Sessions ({webinar.sessions.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {webinar.sessions.map((session, idx) => {
              const status = getSessionStatus(session);
              const hasRecording = session.recordingStatus === 'ready';

              return (
                <div
                  key={session.id}
                  style={{
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    background: status === 'live' ? '#fef3f2' : '#fff',
                  }}
                >
                  <div
                    style={{
                      padding: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '20px',
                      flexWrap: 'wrap',
                    }}
                  >
                    {/* Session Number */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background:
                          status === 'live'
                            ? '#ef4444'
                            : status === 'completed'
                              ? '#10b981'
                              : 'var(--color-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        fontWeight: '600',
                        flexShrink: 0,
                      }}
                    >
                      {idx + 1}
                    </div>

                    {/* Session Info */}
                    <div style={{ flex: 1, minWidth: '200px' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '4px',
                        }}
                      >
                        <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>
                          {session.title}
                        </h3>
                        {status === 'live' && (
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#ef4444',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            LIVE
                          </span>
                        )}
                        {status === 'completed' && (
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#10b981',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            COMPLETED
                          </span>
                        )}
                        {hasRecording && (
                          <span
                            style={{
                              padding: '2px 8px',
                              background: '#6366f1',
                              color: '#fff',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: '600',
                            }}
                          >
                            RECORDING
                          </span>
                        )}
                      </div>
                      {session.description && (
                        <p style={{ fontSize: '14px', color: '#666', margin: '8px 0 0' }}>
                          {session.description}
                        </p>
                      )}
                    </div>

                    {/* Date & Time */}
                    <div style={{ textAlign: 'right', minWidth: '180px' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
                        {formatDate(session.startTime)}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {formatTime(session.startTime)} - {formatTime(session.endTime)}
                      </div>
                      <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>
                        {session.duration} min
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* What You'll Learn */}
        {webinar.whatYouWillLearn && webinar.whatYouWillLearn.length > 0 && (
          <section
            style={{
              background: '#fff',
              padding: '32px',
              borderRadius: '12px',
              marginBottom: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '24px',
              }}
            >
              What You Will Learn
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {webinar.whatYouWillLearn.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <span style={{ color: '#10b981', fontSize: '20px' }}>&#10003;</span>
                  <span style={{ fontSize: '15px', color: '#4a5568', lineHeight: '1.5' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Requirements */}
        {webinar.requirements && webinar.requirements.length > 0 && (
          <section
            style={{
              background: '#fff',
              padding: '32px',
              borderRadius: '12px',
              marginBottom: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '24px',
              }}
            >
              Requirements
            </h2>
            <ul style={{ margin: 0, paddingLeft: '24px' }}>
              {webinar.requirements.map((req, idx) => (
                <li
                  key={idx}
                  style={{
                    fontSize: '15px',
                    color: '#4a5568',
                    lineHeight: '1.8',
                  }}
                >
                  {req}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Expert Bio */}
        {expert.bio && (
          <section
            style={{
              background: '#fff',
              padding: '32px',
              borderRadius: '12px',
              marginBottom: '32px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '24px',
              }}
            >
              About the Instructor
            </h2>
            <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundImage: `url(${expert.avatar || '/images/default-avatar.jpg'})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  flexShrink: 0,
                }}
              />
              <div>
                <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                  {expert.name}
                </h3>
                {expert.title && (
                  <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                    {expert.title}
                  </p>
                )}
                <p style={{ fontSize: '15px', color: '#4a5568', lineHeight: '1.7' }}>
                  {expert.bio}
                </p>
                {expert.specializations && expert.specializations.length > 0 && (
                  <div style={{ marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {expert.specializations.map((spec, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '4px 12px',
                          background: '#f7fafc',
                          borderRadius: '16px',
                          fontSize: '13px',
                          color: '#4a5568',
                        }}
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        {!isCompleted && (
          <section
            style={{
              background: 'linear-gradient(135deg, var(--color-primary) 0%, #1a365d 100%)',
              padding: '48px 32px',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#fff',
            }}
          >
            <h2 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '16px' }}>
              Ready to join this live session?
            </h2>
            <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '24px' }}>
              {nextSession
                ? `Next session: ${formatDate(nextSession.startTime)} at ${formatTime(nextSession.startTime)}`
                : 'Secure your spot now!'}
            </p>
            <button
              onClick={handleRegisterClick}
              disabled={registerLoading}
              style={{
                padding: '14px 32px',
                background: '#fff',
                color: 'var(--color-primary)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: registerLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: registerLoading ? 0.7 : 1,
              }}
            >
              {registerLoading
                ? 'Registering...'
                : isRegistered
                  ? 'Access Webinar'
                  : webinar.price === 0
                    ? 'Register Free'
                    : `Register Now - $${webinar.price}`}
            </button>
          </section>
        )}
      </div>

      {/* Payment Modal for paid webinars */}
      {webinar && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          type="webinar"
          item={{
            id: webinar.id,
            title: webinar.title,
            price: webinar.price,
            currency: webinar.currency,
          }}
          expertId={expertId || webinar.expertId}
        />
      )}

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={notification !== null}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        duration={4000}
      />
    </div>
  );
}
