'use client';

import { useState, useEffect, useRef } from 'react';
import type { SectionPreviewProps } from '../types';
import type { Course } from '@/types';

export default function CoursesPreview({ data, expertId, expertName }: SectionPreviewProps) {
  const courses = data.courses;
  const [courseList, setCourseList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrollPosition, setScrollPosition] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

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

  // Show placeholder if no courses
  if (!loading && courseList.length === 0) {
    return (
      <section
        style={{
          padding: '40px 20px',
          background: '#f8f8f8',
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
          No courses yet. Create your first course to show it here.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '40px 20px',
        background: '#f8f8f8',
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
            {courseList.length > 2 && (
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
                <div
                  key={course.id}
                  style={{
                    flex: '0 0 260px',
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Course Thumbnail */}
                  <div
                    style={{
                      width: '100%',
                      height: '120px',
                      background: course.thumbnail
                        ? `url(${course.thumbnail}) center/cover`
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    }}
                  />

                  {/* Course Info */}
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
                      {course.title}
                    </h3>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px',
                        color: '#666',
                      }}
                    >
                      {course.level && (
                        <span
                          style={{
                            padding: '2px 6px',
                            background: '#f3f4f6',
                            borderRadius: '4px',
                          }}
                        >
                          {course.level}
                        </span>
                      )}
                      {course.price !== undefined && (
                        <span style={{ fontWeight: '600', color: '#111' }}>
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
            <span
              style={{
                fontSize: '14px',
                color: '#2563eb',
                fontWeight: '500',
              }}
            >
              View all courses →
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
