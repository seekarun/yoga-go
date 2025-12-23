'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { SectionPreviewProps } from '../types';
import type { Webinar } from '@/types';

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
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

export default function WebinarsPreview({ data, expertId, expertName }: SectionPreviewProps) {
  const webinars = data.webinars;
  const [webinarList, setWebinarList] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWebinars = async () => {
      if (!expertId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/data/webinars?expertId=${expertId}`);
        const result = await response.json();

        if (result.success && result.data) {
          // Filter to show only SCHEDULED or LIVE webinars
          const activeWebinars = result.data.filter(
            (w: Webinar) => w.status === 'SCHEDULED' || w.status === 'LIVE'
          );
          setWebinarList(activeWebinars);
        }
      } catch (err) {
        console.error('[DBG][WebinarsPreview] Error fetching webinars:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchWebinars();
  }, [expertId]);

  const title = webinars?.title || 'Live Sessions';
  const description =
    webinars?.description || `Join ${expertName || 'our expert'} in live interactive sessions`;

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 280;
    const newPosition =
      direction === 'left'
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
    carouselRef.current.scrollTo({ left: newPosition, behavior: 'smooth' });
    setScrollPosition(newPosition);
  };

  const handleScroll = () => {
    if (carouselRef.current) {
      setScrollPosition(carouselRef.current.scrollLeft);
    }
  };

  // Show placeholder if no webinars
  if (!loading && webinarList.length === 0) {
    return (
      <section
        style={{
          padding: '40px 20px',
          background: '#fff',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#111',
          }}
        >
          {title}
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No live sessions scheduled. Check back soon!
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '40px 20px',
        background: '#fff',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#111',
            }}
          >
            {title}
          </h2>
          <p
            style={{
              fontSize: '14px',
              color: '#666',
            }}
          >
            {description}
          </p>
        </div>

        {/* Carousel */}
        {loading ? (
          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
            }}
          >
            {[1, 2].map(i => (
              <div
                key={i}
                style={{
                  width: '260px',
                  height: '200px',
                  background: '#e5e7eb',
                  borderRadius: '12px',
                }}
              />
            ))}
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            {/* Scroll Buttons */}
            {webinarList.length > 2 && (
              <>
                <button
                  onClick={() => scroll('left')}
                  style={{
                    position: 'absolute',
                    left: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                    opacity: scrollPosition > 0 ? 1 : 0.5,
                  }}
                  disabled={scrollPosition === 0}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => scroll('right')}
                  style={{
                    position: 'absolute',
                    right: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Webinar Cards */}
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              style={{
                display: 'flex',
                gap: '16px',
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                padding: '4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {webinarList.map(webinar => {
                const nextSession = webinar.sessions[0];
                const isLive = webinar.status === 'LIVE';

                return (
                  <Link
                    key={webinar.id}
                    href={`/webinars/${webinar.id}`}
                    style={{
                      flex: '0 0 260px',
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
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                    }}
                  >
                    {/* Webinar Thumbnail */}
                    <div
                      style={{
                        width: '100%',
                        height: '100px',
                        background: webinar.thumbnail
                          ? `url(${webinar.thumbnail}) center/cover`
                          : 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                        position: 'relative',
                      }}
                    >
                      {isLive && (
                        <span
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            padding: '4px 8px',
                            background: '#ef4444',
                            color: '#fff',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: '700',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              background: '#fff',
                              borderRadius: '50%',
                            }}
                          />
                          LIVE
                        </span>
                      )}
                    </div>

                    {/* Webinar Info */}
                    <div style={{ padding: '12px' }}>
                      <h3
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111',
                          marginBottom: '6px',
                          lineHeight: '1.3',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {webinar.title}
                      </h3>

                      {nextSession && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666',
                            marginBottom: '8px',
                          }}
                        >
                          {formatDate(nextSession.startTime)} at {formatTime(nextSession.startTime)}
                        </div>
                      )}

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '12px',
                        }}
                      >
                        <span
                          style={{
                            padding: '2px 6px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                            color: '#666',
                          }}
                        >
                          {webinar.sessions.length} session
                          {webinar.sessions.length !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontWeight: '600', color: '#111' }}>
                          {webinar.price === 0 ? 'Free' : `$${webinar.price}`}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* View All Link */}
        {webinarList.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link
              href="/webinars"
              style={{
                fontSize: '14px',
                color: 'var(--brand-600)',
                fontWeight: '500',
                textDecoration: 'none',
              }}
            >
              View all sessions →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
