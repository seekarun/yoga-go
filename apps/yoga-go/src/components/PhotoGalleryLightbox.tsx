'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface GalleryImage {
  id: string;
  url: string;
  thumbUrl?: string;
  caption?: string;
  attribution?: {
    photographerName: string;
    photographerUrl: string;
    unsplashUrl: string;
  };
}

interface PhotoGalleryLightboxProps {
  images: GalleryImage[];
  title?: string;
  description?: string;
}

export default function PhotoGalleryLightbox({
  images,
  title = 'Gallery',
  description,
}: PhotoGalleryLightboxProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Navigate to next image (with cycling)
  const goToNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % images.length);
  }, [images.length]);

  // Navigate to previous image (with cycling)
  const goToPrev = useCallback(() => {
    setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Open lightbox at specific index
  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  // Keyboard navigation
  useEffect(() => {
    if (!lightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          goToNext();
          break;
        case 'ArrowLeft':
          goToPrev();
          break;
        case 'Escape':
          closeLightbox();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll when lightbox is open
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxOpen, goToNext, goToPrev]);

  // Carousel scroll functions
  const scrollCarousel = (direction: 'left' | 'right') => {
    if (!carouselRef.current) return;
    const scrollAmount = 340; // Card width + gap
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

  // Check if we can scroll more
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight =
    carouselRef.current &&
    scrollPosition < carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10;

  const currentImage = images[currentIndex];

  return (
    <>
      <section style={{ padding: '80px 20px', background: '#fff' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '48px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '16px',
              color: '#1a202c',
            }}
          >
            {title}
          </h2>
          {description && (
            <p
              style={{
                fontSize: '18px',
                textAlign: 'center',
                marginBottom: '48px',
                color: '#666',
              }}
            >
              {description}
            </p>
          )}

          {/* Gallery Carousel with Navigation */}
          <div style={{ position: 'relative' }}>
            {/* Left Arrow */}
            {images.length > 3 && (
              <button
                onClick={() => scrollCarousel('left')}
                disabled={!canScrollLeft}
                style={{
                  position: 'absolute',
                  left: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  cursor: canScrollLeft ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  opacity: canScrollLeft ? 1 : 0.4,
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  if (canScrollLeft)
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(-50%)';
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {/* Right Arrow */}
            {images.length > 3 && (
              <button
                onClick={() => scrollCarousel('right')}
                disabled={!canScrollRight}
                style={{
                  position: 'absolute',
                  right: '-20px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  cursor: canScrollRight ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  opacity: canScrollRight ? 1 : 0.4,
                  transition: 'opacity 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => {
                  if (canScrollRight)
                    e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(-50%)';
                }}
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#333"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            {/* Image Carousel */}
            <div
              ref={carouselRef}
              onScroll={handleScroll}
              style={{
                display: 'flex',
                gap: '20px',
                overflowX: 'auto',
                scrollBehavior: 'smooth',
                padding: '8px 4px',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
              }}
            >
              {images.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => openLightbox(index)}
                  style={{
                    flex: '0 0 320px',
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    padding: 0,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '240px',
                      backgroundImage: `url(${image.thumbUrl || image.url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      position: 'relative',
                    }}
                  >
                    {/* Hover overlay with zoom icon */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0,0,0,0.3)',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      className="hover-overlay"
                    >
                      <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                        <path d="M11 8v6M8 11h6" />
                      </svg>
                    </div>
                  </div>
                  {image.caption && (
                    <div style={{ padding: '16px', textAlign: 'left' }}>
                      <p
                        style={{
                          fontSize: '14px',
                          color: '#666',
                          lineHeight: '1.5',
                          margin: 0,
                        }}
                      >
                        {image.caption}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Photo count and keyboard hint */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              marginTop: '24px',
            }}
          >
            <span style={{ fontSize: '14px', color: '#9ca3af' }}>
              {images.length} {images.length === 1 ? 'photo' : 'photos'}
            </span>
            <span style={{ fontSize: '12px', color: '#d1d5db' }}>• Click to enlarge</span>
          </div>
        </div>
      </section>

      {/* Lightbox Overlay */}
      {lightboxOpen && currentImage && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              width: '48px',
              height: '48px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>

          {/* Previous button */}
          <button
            onClick={e => {
              e.stopPropagation();
              goToPrev();
            }}
            style={{
              position: 'absolute',
              left: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '56px',
              height: '56px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next button */}
          <button
            onClick={e => {
              e.stopPropagation();
              goToNext();
            }}
            style={{
              position: 'absolute',
              right: '20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '56px',
              height: '56px',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.transform = 'translateY(-50%)';
            }}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Main image */}
          <div
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <img
              src={currentImage.url}
              alt={currentImage.caption || `Photo ${currentIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '70vh',
                objectFit: 'contain',
                borderRadius: '8px',
              }}
            />

            {/* Caption and attribution */}
            <div style={{ marginTop: '20px', textAlign: 'center', maxWidth: '600px' }}>
              {currentImage.caption && (
                <p style={{ color: '#fff', fontSize: '16px', marginBottom: '8px' }}>
                  {currentImage.caption}
                </p>
              )}
              {currentImage.attribution && (
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px' }}>
                  Photo by{' '}
                  <a
                    href={currentImage.attribution.photographerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {currentImage.attribution.photographerName}
                  </a>{' '}
                  on{' '}
                  <a
                    href={currentImage.attribution.unsplashUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'underline' }}
                    onClick={e => e.stopPropagation()}
                  >
                    Unsplash
                  </a>
                </p>
              )}
            </div>
          </div>

          {/* Image counter */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>
              {currentIndex + 1} / {images.length}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px' }}>
              Use ← → keys to navigate
            </span>
          </div>

          {/* Thumbnail strip */}
          <div
            style={{
              position: 'absolute',
              bottom: '60px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: '8px',
              padding: '8px',
              background: 'rgba(0,0,0,0.5)',
              borderRadius: '8px',
              maxWidth: '80vw',
              overflowX: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {images.map((image, index) => (
              <button
                key={image.id}
                onClick={() => setCurrentIndex(index)}
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '4px',
                  border: index === currentIndex ? '2px solid #fff' : '2px solid transparent',
                  backgroundImage: `url(${image.thumbUrl || image.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  cursor: 'pointer',
                  opacity: index === currentIndex ? 1 : 0.6,
                  transition: 'opacity 0.2s, border-color 0.2s',
                  flexShrink: 0,
                  padding: 0,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = index === currentIndex ? '1' : '0.6';
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* CSS for hover effect on cards */}
      <style>{`
        .hover-overlay {
          opacity: 0 !important;
        }
        button:hover .hover-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
}
