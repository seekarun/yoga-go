import Link from 'next/link';
import type { WebinarsSectionProps } from '../../types';
import { formatPrice } from '@/lib/currency/currencyService';

export default function WebinarsSection({ title, description, webinars }: WebinarsSectionProps) {
  return (
    <section
      id="webinars"
      style={{
        padding: '100px 40px',
        background: '#0f0f0f',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle gradient overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'radial-gradient(ellipse at top, color-mix(in srgb, var(--brand-500) 8%, transparent) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            {title || 'Live Sessions'}
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '600px',
              margin: '0 auto',
              lineHeight: '1.6',
            }}
          >
            {description || 'Join our live interactive sessions'}
          </p>
        </div>

        {webinars.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 40px',
              background: 'rgba(255,255,255,0.02)',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '16px' }}>
              No live sessions scheduled. Check back soon!
            </p>
          </div>
        ) : (
          <>
            {/* Webinar Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '24px',
                marginBottom: '40px',
              }}
            >
              {webinars.slice(0, 3).map(webinar => {
                const nextSession = webinar.sessions[0];
                const isLive = webinar.status === 'LIVE';

                return (
                  <Link
                    key={webinar.id}
                    href={`/webinars/${webinar.id}`}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '20px',
                      overflow: 'hidden',
                      border: isLive ? '2px solid #ef4444' : '1px solid rgba(255,255,255,0.1)',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.3s, box-shadow 0.3s',
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '100%',
                        height: '180px',
                        background: webinar.thumbnail
                          ? `url(${webinar.thumbnail}) center/cover`
                          : 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
                        position: 'relative',
                      }}
                    >
                      {/* Live Badge */}
                      {isLive && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '16px',
                            left: '16px',
                            padding: '8px 14px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '8px',
                            fontSize: '12px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
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

                      {/* Session count badge */}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '16px',
                          right: '16px',
                          padding: '6px 12px',
                          background: 'rgba(0,0,0,0.7)',
                          backdropFilter: 'blur(8px)',
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
                    <div style={{ padding: '24px' }}>
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#fff',
                          marginBottom: '12px',
                          lineHeight: '1.4',
                        }}
                      >
                        {webinar.title}
                      </h3>

                      {nextSession && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '16px',
                            padding: '10px 14px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '8px',
                          }}
                        >
                          <span style={{ fontSize: '16px' }}>📅</span>
                          <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                            {new Date(nextSession.startTime).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at{' '}
                            {new Date(nextSession.startTime).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true,
                            })}
                          </span>
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '20px',
                            fontWeight: '700',
                            color: '#fff',
                          }}
                        >
                          {webinar.price === 0 ? (
                            <span style={{ color: '#22c55e' }}>Free</span>
                          ) : (
                            formatPrice(webinar.price, webinar.currency || 'USD')
                          )}
                        </span>
                        <span
                          style={{
                            padding: '8px 16px',
                            background:
                              'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                            color: 'var(--brand-500-contrast)',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: '600',
                          }}
                        >
                          Join Now
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* View All Button */}
            {webinars.length > 3 && (
              <div style={{ textAlign: 'center' }}>
                <Link
                  href="/webinars"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '16px 32px',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    borderRadius: '12px',
                    fontSize: '15px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  View All Sessions
                  <span style={{ fontSize: '18px' }}>→</span>
                </Link>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </section>
  );
}
