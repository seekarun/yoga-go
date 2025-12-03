'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ExpertReviewsTable from '@/components/ExpertReviewsTable';

export default function CourseReviewsPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const courseId = params.courseId as string;
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch course title
    const fetchCourseTitle = async () => {
      try {
        const response = await fetch(`/data/courses/${courseId}`);
        const data = await response.json();
        if (data.success) {
          setCourseTitle(data.data.title);
        }
      } catch (error) {
        console.error('[DBG][course-reviews] Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseTitle();
  }, [courseId]);

  if (loading) {
    return (
      <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '80px', minHeight: '100vh', background: '#f8f8f8' }}>
      <div
        style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px 20px',
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <Link
              href={`/srv/${expertId}/courses/${courseId}`}
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Back to Course
            </Link>
          </div>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              marginBottom: '8px',
              color: '#1a202c',
            }}
          >
            Course Reviews
          </h1>
          <p style={{ fontSize: '16px', color: '#666' }}>{courseTitle}</p>
        </div>

        {/* Reviews Table */}
        <ExpertReviewsTable courseId={courseId} expertId={expertId} />
      </div>
    </div>
  );
}
