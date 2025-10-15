'use client';

import { useState, useEffect } from 'react';
import type { Course } from '@/types';
import CourseCard from '@/components/CourseCard';

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
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
              {courses.map(course => (
                <CourseCard key={course.id} course={course} variant="full" />
              ))}
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
