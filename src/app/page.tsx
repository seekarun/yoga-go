'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { Expert } from '@/types';

export default function Home() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExperts = async () => {
      try {
        console.log('[DBG][page.tsx] Fetching experts...');
        const response = await fetch('/data/experts');
        const data = await response.json();
        console.log('[DBG][page.tsx] Experts data:', data);
        setExperts(data.data || []);
        console.log('[DBG][page.tsx] Experts state set to:', data.data);
      } catch (error) {
        console.error('[DBG][page.tsx] Error fetching experts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExperts();
  }, []);

  useEffect(() => {
    if (experts.length > 0) {
      const timer = setInterval(() => {
        setCurrentSlide(prev => (prev + 1) % experts.length);
      }, 5000); // Auto-advance every 5 seconds

      return () => clearInterval(timer);
    }
  }, [experts.length]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide(prev => (prev + 1) % experts.length);
  };

  const prevSlide = () => {
    setCurrentSlide(prev => (prev - 1 + experts.length) % experts.length);
  };

  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Full Screen Carousel */}
      <section
        style={{
          flex: 1,
          minHeight: 'calc(100vh - 64px)',
          position: 'relative',
          background: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
            }}
          >
            <div
              style={{
                fontSize: '16px',
                color: '#666',
              }}
            >
              Loading experts...
            </div>
          </div>
        ) : experts.length > 0 ? (
          <>
            {/* Slides */}
            <div
              style={{
                position: 'relative',
                height: '100%',
                width: '100%',
              }}
            >
              {experts.map((expert, index) => (
                <div
                  key={expert.id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: currentSlide === index ? 1 : 0,
                    transition: 'opacity 1s ease-in-out',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ffffff',
                    padding: '40px 20px',
                  }}
                >
                  {/* Expert Name */}
                  <h1
                    style={{
                      fontSize: '48px',
                      fontWeight: '600',
                      marginBottom: '32px',
                      color: '#000',
                    }}
                  >
                    {expert.name}
                  </h1>

                  {/* Expert Image */}
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    style={{
                      width: '100%',
                      maxWidth: '800px',
                      height: 'auto',
                      borderRadius: '16px',
                      objectFit: 'cover',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Navigation Arrows */}
            <button
              onClick={prevSlide}
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#fff',
                border: '1px solid #e2e8f0',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f7fafc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              <svg width="24" height="24" fill="#4a5568" viewBox="0 0 24 24">
                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
              </svg>
            </button>

            <button
              onClick={nextSlide}
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#fff',
                border: '1px solid #e2e8f0',
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f7fafc';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              <svg width="24" height="24" fill="#4a5568" viewBox="0 0 24 24">
                <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
              </svg>
            </button>

            {/* Dots Indicator */}
            <div
              style={{
                position: 'absolute',
                bottom: '40px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
              }}
            >
              {experts.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  style={{
                    width: currentSlide === index ? '32px' : '8px',
                    height: '8px',
                    borderRadius: '4px',
                    background: currentSlide === index ? '#000' : '#e2e8f0',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                  }}
                />
              ))}
            </div>
          </>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f5f5f5',
            }}
          >
            <div
              style={{
                textAlign: 'center',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No experts available</h2>
              <p style={{ color: '#666' }}>Please check back later</p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
