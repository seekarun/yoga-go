'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Course } from '@/types';

export default function CoursesPage() {
  const { user: _user, isAuthenticated } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('[DBG][courses-page] Fetching all courses...');
        const response = await fetch('/data/courses');
        const data = await response.json();

        if (data.success) {
          setCourses(data.data || []);
          console.log('[DBG][courses-page] Courses loaded:', data.data);
        }
      } catch (error) {
        console.error('[DBG][courses-page] Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  // Fetch user's enrolled courses
  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!isAuthenticated) {
        setEnrolledCourseIds([]);
        return;
      }

      try {
        const response = await fetch('/data/app/courses');
        const data = await response.json();

        if (data.success && data.data?.enrolled) {
          const ids = data.data.enrolled.map((course: { id: string }) => course.id);
          setEnrolledCourseIds(ids);
          console.log('[DBG][courses-page] Enrolled course IDs:', ids);
        }
      } catch (error) {
        console.error('[DBG][courses-page] Error fetching enrolled courses:', error);
      }
    };

    fetchEnrolledCourses();
  }, [isAuthenticated]);

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Courses Grid */}
      <section style={{ padding: '40px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
              }}
            >
              <div style={{ fontSize: '16px', color: '#666' }}>Loading courses...</div>
            </div>
          ) : courses.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '32px',
              }}
            >
              {courses.map(course => {
                const isEnrolled = enrolledCourseIds.includes(course.id);

                return (
                  <Link
                    key={course.id}
                    href={isEnrolled ? `/app/courses/${course.id}` : `/courses/${course.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
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
                      {/* Course Thumbnail */}
                      <div
                        style={{
                          height: '200px',
                          backgroundImage: `url(${course.thumbnail})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                        }}
                      >
                        {/* Badges */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '16px',
                            left: '16px',
                            display: 'flex',
                            gap: '8px',
                          }}
                        >
                          {isEnrolled && (
                            <span
                              style={{
                                padding: '6px 12px',
                                background: '#2563eb',
                                color: '#fff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              ENROLLED
                            </span>
                          )}
                          {course.isNew && (
                            <span
                              style={{
                                padding: '6px 12px',
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
                          {course.featured && (
                            <span
                              style={{
                                padding: '6px 12px',
                                background: '#764ba2',
                                color: '#fff',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                              }}
                            >
                              FEATURED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Course Info */}
                      <div
                        style={{
                          padding: '24px',
                          flex: '1',
                          display: 'flex',
                          flexDirection: 'column',
                        }}
                      >
                        {/* Category & Level */}
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                          <span
                            style={{
                              padding: '4px 12px',
                              background: '#f7fafc',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#764ba2',
                              fontWeight: '600',
                            }}
                          >
                            {course.category}
                          </span>
                          <span
                            style={{
                              padding: '4px 12px',
                              background: '#f7fafc',
                              borderRadius: '6px',
                              fontSize: '12px',
                              color: '#4a5568',
                            }}
                          >
                            {course.level}
                          </span>
                        </div>

                        <h2
                          style={{
                            fontSize: '20px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            lineHeight: '1.4',
                          }}
                        >
                          {course.title}
                        </h2>

                        <p
                          style={{
                            fontSize: '14px',
                            color: '#666',
                            lineHeight: '1.6',
                            marginBottom: '16px',
                            flex: '1',
                          }}
                        >
                          {course.description}
                        </p>

                        {/* Instructor */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundImage: `url(${course.instructor.avatar})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                          <div style={{ fontSize: '14px', color: '#4a5568' }}>
                            {course.instructor.name}
                          </div>
                        </div>

                        {/* Stats */}
                        <div
                          style={{
                            display: 'flex',
                            gap: '16px',
                            paddingTop: '16px',
                            borderTop: '1px solid #e2e8f0',
                            marginBottom: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: '#FFB800' }}>★</span>
                            <span style={{ fontSize: '14px', fontWeight: '600' }}>
                              {course.rating}
                            </span>
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>
                            {course.totalLessons} lessons
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>{course.duration}</div>
                        </div>

                        {/* Price / Enrollment Status */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          {isEnrolled ? (
                            <div
                              style={{
                                width: '100%',
                                padding: '12px',
                                background: '#2563eb',
                                color: '#fff',
                                borderRadius: '8px',
                                fontSize: '14px',
                                fontWeight: '600',
                                textAlign: 'center',
                              }}
                            >
                              Continue Learning →
                            </div>
                          ) : (
                            <>
                              <div
                                style={{ fontSize: '24px', fontWeight: '600', color: '#764ba2' }}
                              >
                                ${course.price}
                              </div>
                              <div style={{ fontSize: '12px', color: '#48bb78' }}>
                                {course.freeLessons} free lessons
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px',
                background: '#fff',
                borderRadius: '16px',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No courses found</h2>
              <p style={{ color: '#666' }}>Try adjusting your filters.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
