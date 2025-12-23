'use client';

import { useState, useRef } from 'react';
import type { SectionPreviewProps } from '../types';

// Mock gallery images for preview when no real images exist
const MOCK_GALLERY_IMAGES = [
  { id: 'mock-1', url: '/template/gallery1.jpg', caption: 'Peaceful morning yoga session' },
  { id: 'mock-2', url: '/template/gallery2.jpg', caption: 'Group meditation practice' },
  { id: 'mock-3', url: '/template/gallery1.jpg', caption: 'Advanced pose workshop' },
  { id: 'mock-4', url: '/template/gallery2.jpg', caption: 'Sunset yoga by the beach' },
];

export default function PhotoGalleryPreview({
  data,
  expertName: _expertName,
  template = 'classic',
}: SectionPreviewProps) {
  const photoGallery = data.photoGallery;
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isModern = template === 'modern';

  const title = photoGallery?.title || 'Gallery';
  const description = photoGallery?.description || 'Moments from my yoga journey';
  // Use mock images if no real images exist
  const realImages = photoGallery?.images || [];
  const images = realImages.length > 0 ? realImages : MOCK_GALLERY_IMAGES;

  const scroll = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 280; // Card width + gap
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

  // Modern template - Masonry-style gallery with hover effects
  if (isModern) {
    return (
      <section
        style={{
          padding: '100px 40px',
          background: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradient */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '80%',
            height: '80%',
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-500) 8%, transparent) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, var(--brand-500))',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--brand-400)',
                }}
              >
                Gallery
              </span>
              <span
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, var(--brand-500), transparent)',
                }}
              />
            </div>
            <h2
              style={{
                fontSize: '42px',
                fontWeight: '800',
                color: '#fff',
                letterSpacing: '-0.02em',
                marginBottom: '16px',
              }}
            >
              {title}
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.6)',
                maxWidth: '500px',
                margin: '0 auto',
              }}
            >
              {description}
            </p>
          </div>

          {/* Masonry Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gridTemplateRows: 'repeat(2, 200px)',
              gap: '16px',
            }}
          >
            {images.slice(0, 4).map((image, idx) => (
              <div
                key={image.id}
                style={{
                  position: 'relative',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  gridColumn: idx === 0 ? 'span 2' : 'span 1',
                  gridRow: idx === 0 ? 'span 2' : 'span 1',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
              >
                {/* Image */}
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    background: `url(${image.url}) center/cover`,
                  }}
                />

                {/* Gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '60%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                    pointerEvents: 'none',
                  }}
                />

                {/* Caption */}
                {image.caption && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '16px',
                      right: '16px',
                    }}
                  >
                    <p
                      style={{
                        fontSize: idx === 0 ? '16px' : '13px',
                        fontWeight: '500',
                        color: '#fff',
                        textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {image.caption}
                    </p>
                  </div>
                )}

                {/* Corner accent for featured image */}
                {idx === 0 && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      padding: '8px 16px',
                      background:
                        'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                      borderRadius: '50px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: 'var(--brand-500-contrast)',
                      }}
                    >
                      Featured
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* View All Button */}
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 28px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50px',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              View All Photos
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </span>
          </div>
        </div>
      </section>
    );
  }

  // Classic template - Carousel style
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
          {description && (
            <p
              style={{
                fontSize: '14px',
                color: '#666',
              }}
            >
              {description}
            </p>
          )}
        </div>

        {/* Carousel */}
        <div style={{ position: 'relative' }}>
          {/* Scroll Buttons */}
          {images.length > 2 && (
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

          {/* Image Cards */}
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
            {images.map(image => (
              <div
                key={image.id}
                style={{
                  flex: '0 0 260px',
                  background: '#fff',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                }}
              >
                {/* Image */}
                <div
                  style={{
                    width: '100%',
                    height: '180px',
                    background: `url(${image.url}) center/cover`,
                  }}
                />

                {/* Caption */}
                {image.caption && (
                  <div style={{ padding: '12px' }}>
                    <p
                      style={{
                        fontSize: '13px',
                        color: '#666',
                        lineHeight: '1.4',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {image.caption}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Image Count Indicator */}
        {images.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <span
              style={{
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
