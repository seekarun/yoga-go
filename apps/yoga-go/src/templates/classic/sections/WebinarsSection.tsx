import Link from 'next/link';
import type { WebinarsSectionProps } from '../../types';
import { formatPrice } from '@/lib/currency/currencyService';

export default function WebinarsSection({ title, description, webinars }: WebinarsSectionProps) {
  return (
    <section id="webinars" style={{ padding: '80px 20px', background: '#f8f9fa' }}>
      <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            fontSize: '48px',
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: '16px',
            color: 'var(--brand-500)',
          }}
        >
          {title || 'Live Sessions'}
        </h2>
        <p
          style={{
            fontSize: '18px',
            textAlign: 'center',
            marginBottom: '48px',
            color: '#666',
          }}
        >
          {description || 'Join our live interactive sessions'}
        </p>

        {webinars.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '16px' }}>
            No live sessions scheduled. Check back soon!
          </p>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '24px',
                marginBottom: '32px',
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
                      background: '#fff',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      border: isLive ? '2px solid #ef4444' : '1px solid #e5e7eb',
                      textDecoration: 'none',
                      color: 'inherit',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '160px',
                        background: webinar.thumbnail
                          ? `url(${webinar.thumbnail}) center/cover`
                          : 'linear-gradient(135deg, var(--brand-400, #667eea) 0%, var(--brand-600, #764ba2) 100%)',
                        position: 'relative',
                      }}
                    >
                      {isLive && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            padding: '6px 12px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '700',
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
                    </div>

                    <div style={{ padding: '20px' }}>
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '8px',
                          lineHeight: '1.3',
                        }}
                      >
                        {webinar.title}
                      </h3>

                      {nextSession && (
                        <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
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
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '14px',
                        }}
                      >
                        <span
                          style={{
                            padding: '4px 10px',
                            background: '#f3f4f6',
                            borderRadius: '6px',
                            color: '#666',
                          }}
                        >
                          {webinar.sessions.length} session
                          {webinar.sessions.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontWeight: '700', color: '#111', fontSize: '16px' }}>
                          {webinar.price === 0
                            ? 'Free'
                            : formatPrice(webinar.price, webinar.currency || 'USD')}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {webinars.length > 3 && (
              <div style={{ textAlign: 'center' }}>
                <Link
                  href="/webinars"
                  style={{
                    display: 'inline-block',
                    padding: '14px 32px',
                    background: '#111',
                    color: '#fff',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    transition: 'transform 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = '#333';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = '#111';
                  }}
                >
                  View All Sessions
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
