'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import { CourseListPage as ModernCourseListPage } from '@/templates/modern/pages';
import { CourseListPage as ClassicCourseListPage } from '@/templates/classic/pages';
import type { Course, Expert } from '@/types';
import type { TemplateId } from '@/templates/types';

export default function ExpertCoursesListPageWrapper() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [courses, setCourses] = useState<Course[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch courses and expert data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DBG][expert-courses] Fetching courses and expert data');

        // Fetch courses and expert in parallel
        const [coursesRes, expertRes] = await Promise.all([
          fetch(`/data/courses?instructorId=${expertId}`),
          fetch(`/data/experts/${expertId}`),
        ]);

        // Process courses data
        const coursesData = await coursesRes.json();
        if (coursesData.success) {
          setCourses(coursesData.data || []);
          console.log('[DBG][expert-courses] Courses loaded:', coursesData.data?.length || 0);
        }

        // Process expert data
        const expertData = await expertRes.json();
        if (expertData.success) {
          setExpert(expertData.data);
          console.log('[DBG][expert-courses] Expert loaded:', expertData.data?.name);
        }
      } catch (error) {
        console.error('[DBG][expert-courses] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchData();
    }
  }, [expertId]);

  // Loading state
  if (loading) {
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
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid var(--color-primary, #6b7280)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '16px', color: '#666' }}>Loading courses...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Expert not found
  if (!expert) {
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
          <Link
            href="/"
            style={{
              color: 'var(--color-primary, #6b7280)',
              textDecoration: 'underline',
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Get template preference from expert
  const template: TemplateId = expert.customLandingPage?.template || 'classic';
  const palette = expert.customLandingPage?.theme?.palette;

  // Select the appropriate template component
  const CourseListPage = template === 'modern' ? ModernCourseListPage : ClassicCourseListPage;

  return (
    <LandingPageThemeProvider palette={palette}>
      <CourseListPage courses={courses} expert={expert} />
    </LandingPageThemeProvider>
  );
}
