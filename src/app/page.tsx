'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import type { Expert, Course } from '@/types';

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
                  <Link
                    key={course.id}
                    href={`/courses/${course.id}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      minWidth: '320px',
                      flex: '0 0 320px',
                    }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      {/* Thumbnail */}
                      <div
                        style={{
                          height: '180px',
                          backgroundImage: `url(${course.thumbnail})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                        }}
                      >
                        {course.isNew && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '12px',
                              left: '12px',
                              padding: '4px 12px',
                              background: '#48bb78',
                              color: '#fff',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                            }}
                          >
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div style={{ padding: '20px' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#f7fafc',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#764ba2',
                              fontWeight: '600',
                            }}
                          >
                            {course.category}
                          </span>
                          <span
                            style={{
                              padding: '4px 8px',
                              background: '#f7fafc',
                              borderRadius: '4px',
                              fontSize: '11px',
                              color: '#4a5568',
                            }}
                          >
                            {course.level}
                          </span>
                        </div>

                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            lineHeight: '1.4',
                          }}
                        >
                          {course.title}
                        </h3>

                        <p
                          style={{
                            fontSize: '14px',
                            color: '#666',
                            marginBottom: '16px',
                            lineHeight: '1.5',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {course.description}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '12px',
                          }}
                        >
                          <div
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundImage: `url(${course.instructor.avatar})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <span style={{ fontSize: '13px', color: '#4a5568' }}>
                            {course.instructor.name}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '12px',
                            borderTop: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#FFB800' }}>★</span>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>
                              {course.rating}
                            </span>
                          </div>
                          <div style={{ fontSize: '18px', fontWeight: '600', color: '#764ba2' }}>
                            ${course.price}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
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
                  <Link
                    key={expert.id}
                    href={`/experts/${expert.id}`}
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      minWidth: '380px',
                      flex: '0 0 380px',
                    }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        height: '100%',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                      }}
                    >
                      {/* Expert Image */}
                      <div
                        style={{
                          height: '280px',
                          backgroundImage: `url(${expert.avatar})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      />

                      {/* Info */}
                      <div style={{ padding: '24px' }}>
                        <h3
                          style={{
                            fontSize: '24px',
                            fontWeight: '600',
                            marginBottom: '8px',
                          }}
                        >
                          {expert.name}
                        </h3>
                        <p
                          style={{
                            fontSize: '14px',
                            color: '#764ba2',
                            marginBottom: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {expert.title}
                        </p>
                        <p
                          style={{
                            fontSize: '14px',
                            color: '#666',
                            marginBottom: '20px',
                            lineHeight: '1.6',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {expert.bio}
                        </p>

                        {/* Stats */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '20px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e2e8f0',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginBottom: '4px',
                              }}
                            >
                              <span style={{ color: '#FFB800' }}>★</span>
                              <span style={{ fontWeight: '600', fontSize: '14px' }}>
                                {expert.rating}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Rating</div>
                          </div>
                          <div>
                            <div
                              style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}
                            >
                              {expert.totalStudents.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Students</div>
                          </div>
                          <div>
                            <div
                              style={{ fontWeight: '600', marginBottom: '4px', fontSize: '14px' }}
                            >
                              {expert.totalCourses}
                            </div>
                            <div style={{ fontSize: '12px', color: '#666' }}>Courses</div>
                          </div>
                        </div>

                        {/* Specializations */}
                        {expert.specializations && expert.specializations.length > 0 && (
                          <div
                            style={{
                              display: 'flex',
                              gap: '6px',
                              flexWrap: 'wrap',
                              marginTop: '16px',
                            }}
                          >
                            {expert.specializations.slice(0, 3).map((spec, idx) => (
                              <span
                                key={idx}
                                style={{
                                  padding: '4px 12px',
                                  background: '#f7fafc',
                                  borderRadius: '100px',
                                  fontSize: '12px',
                                  color: '#4a5568',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                {spec}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
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
