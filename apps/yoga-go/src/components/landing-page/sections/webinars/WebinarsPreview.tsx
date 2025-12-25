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

export default function WebinarsPreview({
  data,
  expertId,
  expertName,
  template = 'classic',
}: SectionPreviewProps) {
  const webinars = data.webinars;
  const [webinarList, setWebinarList] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const isModern = template === 'modern';

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

  // Theme-based styles
  const styles = {
    section: {
      padding: '40px 20px',
      background: isModern ? '#0f0f0f' : '#fff',
    },
    title: {
      fontSize: '20px',
      fontWeight: '700' as const,
      marginBottom: '8px',
      color: isModern ? '#fff' : '#111',
    },
    description: {
      fontSize: '14px',
      color: isModern ? 'rgba(255,255,255,0.6)' : '#666',
    },
    emptyText: {
      color: isModern ? 'rgba(255,255,255,0.5)' : '#9ca3af',
      fontSize: '14px',
    },
    card: {
      flex: '0 0 260px',
      background: isModern ? 'rgba(255,255,255,0.03)' : '#fff',
      borderRadius: '12px',
      overflow: 'hidden' as const,
      boxShadow: isModern ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
      textDecoration: 'none' as const,
      color: 'inherit',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    cardBorder: (isLive: boolean) => ({
      border: isLive
        ? '2px solid #ef4444'
        : isModern
          ? '1px solid rgba(255,255,255,0.1)'
          : '1px solid #e5e7eb',
    }),
    cardTitle: {
      fontSize: '14px',
      fontWeight: '600' as const,
      color: isModern ? '#fff' : '#111',
      marginBottom: '6px',
      lineHeight: '1.3',
      display: '-webkit-box' as const,
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden' as const,
    },
    cardDate: {
      fontSize: '12px',
      color: isModern ? 'rgba(255,255,255,0.6)' : '#666',
      marginBottom: '8px',
    },
    badge: {
      padding: '2px 6px',
      background: isModern ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
      borderRadius: '4px',
      color: isModern ? 'rgba(255,255,255,0.8)' : '#666',
    },
    price: {
      fontWeight: '600' as const,
      color: isModern ? '#fff' : '#111',
    },
    navButton: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: isModern ? 'rgba(255,255,255,0.1)' : '#fff',
      border: isModern ? '1px solid rgba(255,255,255,0.2)' : '1px solid #e5e7eb',
      boxShadow: isModern ? 'none' : '0 2px 4px rgba(0,0,0,0.1)',
      cursor: 'pointer',
      display: 'flex' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      zIndex: 10,
      color: isModern ? '#fff' : '#000',
    },
    viewAllLink: {
      fontSize: '14px',
      color: 'var(--brand-600)',
      fontWeight: '500' as const,
      textDecoration: 'none' as const,
    },
    skeleton: {
      width: '260px',
      height: '200px',
      background: isModern ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
      borderRadius: '12px',
    },
  };

  // Show placeholder if no webinars
  if (!loading && webinarList.length === 0) {
    return (
      <section style={{ ...styles.section, textAlign: 'center' }}>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.emptyText}>No live sessions scheduled. Check back soon!</p>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h2 style={styles.title}>{title}</h2>
          <p style={styles.description}>{description}</p>
        </div>

        {/* Carousel */}
        {loading ? (
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
            {[1, 2].map(i => (
              <div key={i} style={styles.skeleton} />
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
                    ...styles.navButton,
                    position: 'absolute',
                    left: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
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
                    ...styles.navButton,
                    position: 'absolute',
                    right: '-12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
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
                      ...styles.card,
                      ...styles.cardBorder(isLive),
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
                      <h3 style={styles.cardTitle}>{webinar.title}</h3>

                      {nextSession && (
                        <div style={styles.cardDate}>
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
                        <span style={styles.badge}>
                          {webinar.sessions.length} session
                          {webinar.sessions.length !== 1 ? 's' : ''}
                        </span>
                        <span style={styles.price}>
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
            <Link href="/webinars" style={styles.viewAllLink}>
              View all sessions →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
