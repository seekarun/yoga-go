'use client';

import { useState, useEffect, useRef } from 'react';
import type { SectionPreviewProps } from '../types';
import type { Course } from '@/types';

export default function CoursesPreview({
  data,
  expertId,
  expertName,
  template = 'classic',
}: SectionPreviewProps) {
  const courses = data.courses;
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const isModern = template === 'modern';

  useEffect(() => {
    const fetchCourses = async () => {
      if (!expertId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/data/courses?instructorId=${expertId}`);
        const result = await response.json();

        if (result.success && result.data) {
          setCourseList(result.data);
        }
      } catch (err) {
        console.error('[DBG][CoursesPreview] Error fetching courses:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [expertId]);

  const title = courses?.title || 'Courses';
  const description =
    courses?.description || `Start your learning journey with ${expertName || 'our expert'}`;

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

  // Theme-based styles
  const styles = {
    section: {
      padding: '40px 20px',
      background: isModern ? '#0a0a0a' : '#f8f8f8',
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
      border: isModern ? '1px solid rgba(255,255,255,0.1)' : 'none',
    },
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
    cardMeta: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '12px',
      color: isModern ? 'rgba(255,255,255,0.6)' : '#666',
    },
    badge: {
      padding: '2px 6px',
      background: isModern ? 'rgba(255,255,255,0.1)' : '#f3f4f6',
      borderRadius: '4px',
      color: isModern ? 'rgba(255,255,255,0.8)' : undefined,
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
    },
    skeleton: {
      width: '260px',
      height: '200px',
      background: isModern ? 'rgba(255,255,255,0.05)' : '#e5e7eb',
      borderRadius: '12px',
    },
  };

  // Show placeholder if no courses
  if (!loading && courseList.length === 0) {
    return (
      <section style={{ ...styles.section, textAlign: 'center' }}>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.emptyText}>No courses yet. Create your first course to show it here.</p>
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
            {courseList.length > 2 && (
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

            {/* Course Cards */}
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
              {courseList.map(course => (
                <div key={course.id} style={styles.card}>
                  {/* Course Thumbnail */}
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      background: course.thumbnail
                        ? `url(${course.thumbnail}) center/cover`
                        : 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                    }}
                  />

                  {/* Course Info */}
                  <div style={{ padding: '12px' }}>
                    <h3 style={styles.cardTitle}>{course.title}</h3>
                    <div style={styles.cardMeta}>
                      {course.level && <span style={styles.badge}>{course.level}</span>}
                      {course.price !== undefined && (
                        <span style={styles.price}>
                          {course.price === 0 ? 'Free' : `$${course.price}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* View All Link */}
        {courseList.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <span style={styles.viewAllLink}>View all courses →</span>
          </div>
        )}
      </div>
    </section>
  );
}
