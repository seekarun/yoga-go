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
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-700) 100%)',
          padding: '60px 20px',
          color: '#fff',
        }}
      >
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Link
            href="/"
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '16px',
              display: 'inline-block',
            }}
          >
            ← Back to {expert.name}
          </Link>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '700',
              marginBottom: '16px',
            }}
          >
            Live Sessions
          </h1>
          <p
            style={{
              fontSize: '18px',
              opacity: 0.9,
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
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: filter === 'upcoming' ? '#fff' : 'rgba(255,255,255,0.2)',
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
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: filter === 'all' ? '#fff' : 'rgba(255,255,255,0.2)',
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
      <section style={{ padding: '40px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Registered badge if applicable */}
          {isAuthenticated && registeredWebinarIds.length > 0 && (
            <div
              style={{
                marginBottom: '24px',
                padding: '12px 20px',
                background: '#e6fffa',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ color: '#319795', fontSize: '18px' }}>✓</span>
              <span style={{ color: '#2c7a7b', fontWeight: '500' }}>
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
                        padding: '4px 12px',
                        background: '#10b981',
                        color: '#fff',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '600',
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
                padding: '60px',
                background: '#fff',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📅</div>
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No live sessions scheduled</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Check back soon for upcoming live sessions with {expert.name}.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
