'use client';

import { useState, useRef } from 'react';
import type { SectionPreviewProps } from '../types';

export default function PhotoGalleryPreview({
  data,
  expertName: _expertName,
}: SectionPreviewProps) {
  const photoGallery = data.photoGallery;
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const title = photoGallery?.title || 'Gallery';
  const description = photoGallery?.description;
  const images = photoGallery?.images || [];

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

  // Show placeholder if no images
  if (images.length === 0) {
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
          No photos yet. Add images to showcase your gallery.
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
