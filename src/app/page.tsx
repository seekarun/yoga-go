'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Expert, Course } from '@/types';
import CourseCard from '@/components/CourseCard';
import ExpertCard from '@/components/ExpertCard';

export default function Home() {
  const [experts, setExperts] = useState<Expert[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const coursesScrollRef = useRef<HTMLDivElement>(null);
  const expertsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DBG][page.tsx] Fetching experts and courses...');

        const [expertsRes, coursesRes] = await Promise.all([
          fetch('/data/experts'),
          fetch('/data/courses'),
        ]);

        const [expertsData, coursesData] = await Promise.all([
          expertsRes.json(),
          coursesRes.json(),
        ]);

        if (expertsData.success) {
          setExperts(expertsData.data || []);
          console.log('[DBG][page.tsx] Experts loaded:', expertsData.data);
        }

        if (coursesData.success) {
          setCourses(coursesData.data || []);
          console.log('[DBG][page.tsx] Courses loaded:', coursesData.data);
        }
      } catch (error) {
        console.error('[DBG][page.tsx] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 400;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#fff' }}>
      {/* Hero Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '120px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: '700',
              marginBottom: '24px',
              lineHeight: '1.2',
            }}
          >
            Transform Your Life Through Yoga
          </h1>
          <p
            style={{
              fontSize: '20px',
              marginBottom: '40px',
              opacity: 0.95,
              lineHeight: '1.6',
            }}
          >
            Discover expert-led courses designed to help you build strength, flexibility, and inner
            peace. Start your journey today.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/courses"
              style={{
                padding: '16px 32px',
                background: '#fff',
                color: '#764ba2',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Browse Courses
            </Link>
            <Link
              href="/experts"
              style={{
                padding: '16px 32px',
                background: 'transparent',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              Meet Our Experts
            </Link>
          </div>
        </div>
      </section>

      {loading ? (
        <div
          style={{
            padding: '80px 20px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      ) : (
        <>
          {/* Featured Courses Carousel */}
          <section style={{ padding: '80px 20px', background: '#f8f8f8' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '40px',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '36px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Featured Courses
                  </h2>
                  <p style={{ fontSize: '16px', color: '#666' }}>
                    Explore our most popular yoga courses
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => scroll(coursesScrollRef, 'left')}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f7fafc';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <svg width="20" height="20" fill="#4a5568" viewBox="0 0 24 24">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scroll(coursesScrollRef, 'right')}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f7fafc';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <svg width="20" height="20" fill="#4a5568" viewBox="0 0 24 24">
                      <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Courses Scroll Container */}
              <div
                ref={coursesScrollRef}
                style={{
                  display: 'flex',
                  gap: '24px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  padding: '4px',
                }}
              >
                {courses.map(course => (
                  <CourseCard key={course.id} course={course} variant="compact" />
                ))}
              </div>

              {courses.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                  <Link
                    href="/courses"
                    style={{
                      padding: '12px 24px',
                      background: '#764ba2',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-block',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    View All Courses
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Expert Instructors Carousel */}
          <section style={{ padding: '80px 20px', background: '#fff' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '40px',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontSize: '36px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Expert Instructors
                  </h2>
                  <p style={{ fontSize: '16px', color: '#666' }}>
                    Learn from world-class yoga masters
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => scroll(expertsScrollRef, 'left')}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f7fafc';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <svg width="20" height="20" fill="#4a5568" viewBox="0 0 24 24">
                      <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => scroll(expertsScrollRef, 'right')}
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f7fafc';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#fff';
                    }}
                  >
                    <svg width="20" height="20" fill="#4a5568" viewBox="0 0 24 24">
                      <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Experts Scroll Container */}
              <div
                ref={expertsScrollRef}
                style={{
                  display: 'flex',
                  gap: '24px',
                  overflowX: 'auto',
                  scrollbarWidth: 'none',
                  padding: '4px',
                }}
              >
                {experts.map(expert => (
                  <ExpertCard key={expert.id} expert={expert} variant="compact" />
                ))}
              </div>

              {experts.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: '40px' }}>
                  <Link
                    href="/experts"
                    style={{
                      padding: '12px 24px',
                      background: '#764ba2',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-block',
                      transition: 'opacity 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    View All Instructors
                  </Link>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
