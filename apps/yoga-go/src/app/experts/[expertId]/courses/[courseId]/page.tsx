'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import PaymentModal from '@/components/payment/PaymentModal';
import { trackCourseView, trackEnrollClick } from '@/lib/analytics';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import { CourseDetailPage as ModernCourseDetailPage } from '@/templates/modern/pages';
import { CourseDetailPage as ClassicCourseDetailPage } from '@/templates/classic/pages';
import type { Course, Lesson, Expert } from '@/types';
import type { TemplateId } from '@/templates/types';

export default function ExpertCourseDetailPageWrapper() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const expertId = params.expertId as string;
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Fetch course and expert data
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DBG][expert-course-detail] Fetching course and expert data');

        // Fetch course, lessons, and expert in parallel
        const [courseRes, lessonsRes, expertRes] = await Promise.all([
          fetch(`/data/courses/${courseId}`),
          fetch(`/data/courses/${courseId}/items`).catch(() => null),
          fetch(`/data/experts/${expertId}`),
        ]);

        // Process course data
        const courseData = await courseRes.json();
        if (courseData.success) {
          setCourse(courseData.data);
          console.log('[DBG][expert-course-detail] Course loaded:', courseData.data?.title);
        } else {
          console.error('[DBG][expert-course-detail] Failed to load course:', courseData.error);
        }

        // Process lessons data
        if (lessonsRes) {
          const lessonsData = await lessonsRes.json();
          if (lessonsData.success) {
            setLessons(lessonsData.data || []);
            console.log(
              '[DBG][expert-course-detail] Lessons loaded:',
              lessonsData.data?.length || 0
            );
          }
        }

        // Process expert data
        const expertData = await expertRes.json();
        if (expertData.success) {
          setExpert(expertData.data);
          console.log('[DBG][expert-course-detail] Expert loaded:', expertData.data?.name);
        }
      } catch (error) {
        console.error('[DBG][expert-course-detail] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId && expertId) {
      fetchData();
      // Track course view
      trackCourseView(courseId).catch(err => {
        console.error('[DBG][expert-course-detail] Failed to track course view:', err);
      });
    }
  }, [courseId, expertId]);

  // Check enrollment status
  useEffect(() => {
    if (isAuthenticated && user && courseId) {
      const enrolled = user.enrolledCourses?.some(ec => ec.courseId === courseId);
      setIsEnrolled(enrolled || false);
    }
  }, [isAuthenticated, user, courseId]);

  const handleEnrollClick = () => {
    // Track enroll click
    trackEnrollClick(courseId).catch(err => {
      console.error('[DBG][expert-course-detail] Failed to track enroll click:', err);
    });

    if (!isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    if (isEnrolled) {
      router.push(`/app/courses/${courseId}`);
      return;
    }

    setShowPaymentModal(true);
  };

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
          <div style={{ fontSize: '16px', color: '#666' }}>Loading course...</div>
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

  // Course not found
  if (!course || !expert) {
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Course not found</h2>
          <Link
            href="/"
            style={{
              color: 'var(--color-primary, #6b7280)',
              textDecoration: 'underline',
            }}
          >
            Back to expert page
          </Link>
        </div>
      </div>
    );
  }

  // Get template preference from expert
  const template: TemplateId = expert.customLandingPage?.template || 'classic';
  const palette = expert.customLandingPage?.theme?.palette;

  // Select the appropriate template component
  const CourseDetailPage = template === 'modern' ? ModernCourseDetailPage : ClassicCourseDetailPage;

  return (
    <LandingPageThemeProvider palette={palette}>
      <CourseDetailPage
        course={course}
        lessons={lessons}
        expert={expert}
        isEnrolled={isEnrolled}
        isAuthenticated={isAuthenticated}
        onEnrollClick={handleEnrollClick}
      />

      {/* Payment Modal */}
      {course && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          type="course"
          item={{
            id: course.id,
            title: course.title,
            price: course.price,
            currency: course.currency,
          }}
          expertId={expert.id}
        />
      )}
    </LandingPageThemeProvider>
  );
}
