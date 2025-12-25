'use client';

import Link from 'next/link';
import type { WebinarListPageProps } from '../../types';
import WebinarCard from '@/components/webinar/WebinarCard';

export default function WebinarListPage({
  webinars,
  expert,
  registeredWebinarIds,
  isAuthenticated,
  filter,
  onFilterChange,
}: WebinarListPageProps) {
  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      {/* Header Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--brand-600) 0%, var(--brand-800) 100%)',
          padding: '60px 20px',
        }}
      >
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Link
            href="/"
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '18px' }}>←</span>
            Back to {expert.name}
          </Link>
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            Live Sessions
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.8)',
              maxWidth: '600px',
              lineHeight: '1.6',
            }}
          >
            Join live sessions with {expert.name}. Learn in real-time, ask questions, and connect
            with fellow practitioners.
          </p>

          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            <button
              onClick={() => onFilterChange('upcoming')}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: filter === 'upcoming' ? '#fff' : 'rgba(255,255,255,0.15)',
                color: filter === 'upcoming' ? 'var(--brand-600)' : '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Upcoming
            </button>
            <button
              onClick={() => onFilterChange('all')}
              style={{
                padding: '12px 28px',
                borderRadius: '10px',
                border: 'none',
                background: filter === 'all' ? '#fff' : 'rgba(255,255,255,0.15)',
                color: filter === 'all' ? 'var(--brand-600)' : '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              All Scheduled
            </button>
          </div>
        </div>
      </section>

      {/* Webinars Grid */}
      <section style={{ padding: '60px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Registered badge if applicable */}
          {isAuthenticated && registeredWebinarIds.length > 0 && (
            <div
              style={{
                marginBottom: '24px',
                padding: '14px 20px',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span style={{ color: '#10b981', fontSize: '20px' }}>✓</span>
              <span style={{ color: '#10b981', fontWeight: '500' }}>
                You are registered for {registeredWebinarIds.length} session
                {registeredWebinarIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {webinars.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '32px',
              }}
            >
              {webinars.map(webinar => (
                <div key={webinar.id} style={{ position: 'relative' }}>
                  {registeredWebinarIds.includes(webinar.id) && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        zIndex: 10,
                        padding: '6px 14px',
                        background: '#10b981',
                        color: '#fff',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                      }}
                    >
                      REGISTERED
                    </div>
                  )}
                  <WebinarCard webinar={webinar} variant="full" />
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 40px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '64px', marginBottom: '24px', display: 'block' }}>📅</span>
              <h2
                style={{ fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}
              >
                No live sessions scheduled
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
                Check back soon for upcoming live sessions with {expert.name}.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
