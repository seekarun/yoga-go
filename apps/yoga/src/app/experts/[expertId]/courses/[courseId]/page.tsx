'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useExpert } from '@/contexts/ExpertContext';
import PaymentModal from '@/components/payment/PaymentModal';
import { trackCourseView, trackEnrollClick } from '@/lib/analytics';
import { CourseDetailPage as ModernCourseDetailPage } from '@/templates/modern/pages';
import { CourseDetailPage as ClassicCourseDetailPage } from '@/templates/classic/pages';
import type { Course, Lesson } from '@/types';

export default function ExpertCourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { expert, template, loading: expertLoading, error: expertError } = useExpert();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);

  // Fetch course and lessons
  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        console.log('[DBG][expert-course-detail] Fetching course:', courseId);

        const [courseRes, lessonsRes] = await Promise.all([
          fetch(`/data/courses/${courseId}`),
          fetch(`/data/courses/${courseId}/items`).catch(() => null),
        ]);

        const courseData = await courseRes.json();
        if (courseData.success) {
          setCourse(courseData.data);
          console.log('[DBG][expert-course-detail] Course loaded:', courseData.data?.title);
        } else {
          console.error('[DBG][expert-course-detail] Failed to load course:', courseData.error);
        }

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
      } catch (error) {
        console.error('[DBG][expert-course-detail] Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
      trackCourseView(courseId).catch(err => {
        console.error('[DBG][expert-course-detail] Failed to track course view:', err);
      });
    }
  }, [courseId]);

  // Check enrollment status
  useEffect(() => {
    if (isAuthenticated && user && courseId) {
      const enrolled = user.enrolledCourses?.some(ec => ec.courseId === courseId);
      setIsEnrolled(enrolled || false);
    }
  }, [isAuthenticated, user, courseId]);

  const handleEnrollClick = () => {
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

  // Show loading while expert or course data is loading
  if (expertLoading || loading) {
    return null; // Layout shows loading state
  }

  // Course or expert not found
  if (expertError || !expert || !course) {
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            {!course ? 'Course not found' : 'Expert not found'}
          </h2>
          <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Select the appropriate template component
  const CourseDetailPage = template === 'modern' ? ModernCourseDetailPage : ClassicCourseDetailPage;

  return (
    <>
      <CourseDetailPage
        course={course}
        lessons={lessons}
        expert={expert}
        isEnrolled={isEnrolled}
        isAuthenticated={isAuthenticated}
        onEnrollClick={handleEnrollClick}
      />

      {/* Payment Modal */}
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
    </>
  );
}
