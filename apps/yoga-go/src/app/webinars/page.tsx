'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { Webinar } from '@/types';
import WebinarCard from '@/components/webinar/WebinarCard';

interface WebinarExpert {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
}

interface WebinarWithExpert extends Webinar {
  expert?: WebinarExpert;
}

export default function WebinarsPage() {
  const { isAuthenticated } = useAuth();
  const [webinars, setWebinars] = useState<WebinarWithExpert[]>([]);
  const [registeredWebinarIds, setRegisteredWebinarIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'all'>('upcoming');

  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        console.log('[DBG][webinars-page] Fetching webinars...');
        const url = filter === 'all' ? '/data/webinars?status=SCHEDULED' : '/data/webinars';
        const response = await fetch(url);
        const data = await response.json();

        if (data.success) {
          setWebinars(data.data || []);
          console.log('[DBG][webinars-page] Webinars loaded:', data.data?.length);
        }
      } catch (error) {
        console.error('[DBG][webinars-page] Error fetching webinars:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, [filter]);

  // Fetch user's registered webinars
  useEffect(() => {
    const fetchRegisteredWebinars = async () => {
      if (!isAuthenticated) {
        setRegisteredWebinarIds([]);
        return;
      }

      try {
        const response = await fetch('/data/app/webinars');
        const data = await response.json();

        if (data.success && data.data) {
          const ids = data.data.map((w: { webinarId: string }) => w.webinarId);
          setRegisteredWebinarIds(ids);
          console.log('[DBG][webinars-page] Registered webinar IDs:', ids);
        }
      } catch (error) {
        console.error('[DBG][webinars-page] Error fetching registered webinars:', error);
      }
    };

    fetchRegisteredWebinars();
  }, [isAuthenticated]);

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #1a365d 100%)',
          padding: '60px 20px',
          color: '#fff',
        }}
      >
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '700',
              marginBottom: '16px',
            }}
          >
            Live Webinars
          </h1>
          <p
            style={{
              fontSize: '18px',
              opacity: 0.9,
              maxWidth: '600px',
              lineHeight: '1.6',
            }}
          >
            Join live yoga sessions with expert instructors. Learn in real-time, ask questions, and
            connect with fellow practitioners.
          </p>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '32px',
            }}
          >
            <button
              onClick={() => setFilter('upcoming')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: filter === 'upcoming' ? '#fff' : 'rgba(255,255,255,0.2)',
                color: filter === 'upcoming' ? 'var(--color-primary)' : '#fff',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: filter === 'all' ? '#fff' : 'rgba(255,255,255,0.2)',
                color: filter === 'all' ? 'var(--color-primary)' : '#fff',
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
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
              }}
            >
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  border: '3px solid #e2e8f0',
                  borderTopColor: 'var(--color-primary)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 16px',
                }}
              />
              <div style={{ fontSize: '16px', color: '#666' }}>Loading webinars...</div>
              <style>
                {`
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                `}
              </style>
            </div>
          ) : webinars.length > 0 ? (
            <>
              {/* Registered badge if applicable */}
              {registeredWebinarIds.length > 0 && (
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
                  <span style={{ color: '#319795', fontSize: '18px' }}>&#10003;</span>
                  <span style={{ color: '#2c7a7b', fontWeight: '500' }}>
                    You are registered for {registeredWebinarIds.length} webinar
                    {registeredWebinarIds.length !== 1 ? 's' : ''}
                  </span>
                </div>
              )}

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
            </>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
                background: '#fff',
                borderRadius: '16px',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>&#128197;</div>
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No webinars scheduled</h2>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Check back soon for upcoming live sessions with our expert instructors.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
