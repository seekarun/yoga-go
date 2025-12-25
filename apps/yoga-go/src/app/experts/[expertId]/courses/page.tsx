'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useExpert } from '@/contexts/ExpertContext';
import { CourseListPage as ModernCourseListPage } from '@/templates/modern/pages';
import { CourseListPage as ClassicCourseListPage } from '@/templates/classic/pages';
import type { Course } from '@/types';

export default function ExpertCoursesListPage() {
  const { expert, expertId, template, loading: expertLoading, error: expertError } = useExpert();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch courses
  useEffect(() => {
    const fetchCourses = async () => {
      if (!expertId) return;

      try {
        console.log('[DBG][expert-courses] Fetching courses for expert:', expertId);
        const res = await fetch(`/data/courses?instructorId=${expertId}`);
        const data = await res.json();

        if (data.success) {
          setCourses(data.data || []);
          console.log('[DBG][expert-courses] Courses loaded:', data.data?.length || 0);
        }
      } catch (error) {
        console.error('[DBG][expert-courses] Error fetching courses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, [expertId]);

  // Show loading while expert or courses are loading
  if (expertLoading || loading) {
    return null; // Layout shows loading state
  }

  // Expert not found
  if (expertError || !expert) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Expert not found</h2>
          <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Select the appropriate template component
  const CourseListPage = template === 'modern' ? ModernCourseListPage : ClassicCourseListPage;

  return <CourseListPage courses={courses} expert={expert} />;
}
