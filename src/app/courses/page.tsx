'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { Course } from '@/types';
import CourseCard from '@/components/CourseCard';

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
                  <div key={course.id} style={{ position: 'relative' }}>
                    {isEnrolled && (
                      <Link
                        href={`/app/courses/${course.id}`}
                        style={{
                          position: 'absolute',
                          top: '16px',
                          left: '16px',
                          zIndex: 10,
                          padding: '6px 12px',
                          background: '#2563eb',
                          color: '#fff',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textDecoration: 'none',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        ENROLLED - Continue →
                      </Link>
                    )}
                    <CourseCard course={course} variant="full" />
                  </div>
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
