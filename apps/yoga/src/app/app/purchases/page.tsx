'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getClientExpertContext } from '@/lib/domainContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Course, Webinar, WebinarRegistration, WebinarSession } from '@/types';

interface EnrolledCourse extends Course {
  enrolledAt?: string;
  progress?: {
    percentComplete: number;
    completedLessons: number;
  };
}

interface WebinarWithRegistration extends Webinar {
  registration: WebinarRegistration;
  expert?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

type PurchaseItem =
  | { type: 'course'; data: EnrolledCourse }
  | { type: 'webinar'; data: WebinarWithRegistration };

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getNextSession(sessions: WebinarSession[]): WebinarSession | null {
  const now = new Date().toISOString();
  const upcomingSessions = sessions
    .filter(s => s.startTime >= now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return upcomingSessions[0] || null;
}

export default function MyPurchases() {
  const { user } = useAuth();
  const { convertPrice } = useCurrency();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [webinars, setWebinars] = useState<WebinarWithRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'courses' | 'live-sessions'>('all');
  const [expertMode, setExpertMode] = useState<{ isExpertMode: boolean; expertId: string | null }>({
    isExpertMode: false,
    expertId: null,
  });

  useEffect(() => {
    const context = getClientExpertContext();
    setExpertMode({
      isExpertMode: context.isExpertMode,
      expertId: context.expertId,
    });
  }, []);

  useEffect(() => {
    const fetchPurchases = async () => {
      try {
        setLoading(true);

        // Fetch both courses and webinars in parallel
        const [coursesRes, webinarsRes] = await Promise.all([
          fetch('/data/app/courses'),
          fetch('/data/app/webinars'),
        ]);

        const [coursesData, webinarsData] = await Promise.all([
          coursesRes.json(),
          webinarsRes.json(),
        ]);

        if (coursesData.success) {
          setCourses(coursesData.data.enrolled || []);
        }

        if (webinarsData.success) {
          setWebinars(webinarsData.data || []);
        }
      } catch (error) {
        console.error('[DBG][my-purchases] Error fetching purchases:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPurchases();
  }, []);

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Filter by expert if on expert subdomain
  const filteredCourses =
    expertMode.isExpertMode && expertMode.expertId
      ? courses.filter(c => c.instructor?.id === expertMode.expertId)
      : courses;

  const filteredWebinars =
    expertMode.isExpertMode && expertMode.expertId
      ? webinars.filter(w => w.expertId === expertMode.expertId)
      : webinars;

  // Combine and sort by purchase date
  const allPurchases: PurchaseItem[] = [
    ...filteredCourses.map(c => ({ type: 'course' as const, data: c })),
    ...filteredWebinars.map(w => ({ type: 'webinar' as const, data: w })),
  ].sort((a, b) => {
    const dateA =
      a.type === 'course' ? a.data.enrolledAt || '' : a.data.registration?.registeredAt || '';
    const dateB =
      b.type === 'course' ? b.data.enrolledAt || '' : b.data.registration?.registeredAt || '';
    return dateB.localeCompare(dateA); // Most recent first
  });

  // Apply filter
  const displayPurchases = allPurchases.filter(item => {
    if (filter === 'all') return true;
    if (filter === 'courses') return item.type === 'course';
    if (filter === 'live-sessions') return item.type === 'webinar';
    return true;
  });

  const formatPrice = (price: number, currency: string) => {
    const priceInfo = convertPrice(
      price,
      currency as 'USD' | 'INR' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'AED'
    );
    return priceInfo.formattedOriginal;
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link
              href="/"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              &larr; Back
            </Link>
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '8px' }}>My Purchases</h1>
          <p style={{ fontSize: '16px', color: '#666' }}>
            Courses and live sessions you&apos;ve purchased
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Filter Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {[
            { key: 'all', label: 'All Purchases' },
            { key: 'courses', label: `Courses (${filteredCourses.length})` },
            { key: 'live-sessions', label: `Live Sessions (${filteredWebinars.length})` },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as typeof filter)}
              style={{
                padding: '10px 20px',
                background: filter === f.key ? 'var(--color-primary)' : '#fff',
                color: filter === f.key ? '#fff' : '#333',
                border: filter === f.key ? 'none' : '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Purchases List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading your purchases...</div>
          </div>
        ) : displayPurchases.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '24px',
            }}
          >
            {displayPurchases.map(item => {
              if (item.type === 'course') {
                const course = item.data;
                return (
                  <Link
                    key={`course-${course.id}`}
                    href={`/app/courses/${course.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        height: '100%',
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
                      {/* Cover Image */}
                      <div
                        style={{
                          height: '160px',
                          backgroundImage: `url(${course.coverImage || course.thumbnail || '/images/default-course.jpg'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            padding: '6px 12px',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Course
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '20px' }}>
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            lineHeight: '1.4',
                          }}
                        >
                          {course.title}
                        </h3>

                        {/* Progress */}
                        {course.progress && (
                          <div style={{ marginBottom: '12px' }}>
                            <div
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                color: '#666',
                                marginBottom: '6px',
                              }}
                            >
                              <span>Progress</span>
                              <span>{course.progress.percentComplete}%</span>
                            </div>
                            <div
                              style={{
                                height: '6px',
                                background: '#e2e8f0',
                                borderRadius: '3px',
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  width: `${course.progress.percentComplete}%`,
                                  background: 'var(--color-primary)',
                                  borderRadius: '3px',
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Meta */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '12px',
                            borderTop: '1px solid #e2e8f0',
                            fontSize: '13px',
                            color: '#666',
                          }}
                        >
                          <span>
                            {course.enrolledAt ? `Enrolled ${formatDate(course.enrolledAt)}` : ''}
                          </span>
                          <span style={{ fontWeight: '600', color: '#333' }}>
                            {formatPrice(course.price, course.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              } else {
                const webinar = item.data;
                const nextSession = getNextSession(webinar.sessions);
                const isCompleted = webinar.status === 'COMPLETED';

                return (
                  <Link
                    key={`webinar-${webinar.id}`}
                    href={`/app/webinars/${webinar.id}`}
                    style={{ textDecoration: 'none', color: 'inherit' }}
                  >
                    <div
                      style={{
                        background: '#fff',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        cursor: 'pointer',
                        height: '100%',
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
                      {/* Cover Image */}
                      <div
                        style={{
                          height: '160px',
                          backgroundImage: `url(${webinar.coverImage || webinar.thumbnail || '/images/default-webinar.jpg'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          position: 'relative',
                        }}
                      >
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            left: '12px',
                            padding: '6px 12px',
                            background: isCompleted ? '#6b7280' : 'var(--color-highlight)',
                            color: '#fff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                          }}
                        >
                          Live Session
                        </span>
                        <span
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            padding: '6px 12px',
                            background: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {webinar.sessions.length} session
                          {webinar.sessions.length !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {/* Content */}
                      <div style={{ padding: '20px' }}>
                        <h3
                          style={{
                            fontSize: '18px',
                            fontWeight: '600',
                            marginBottom: '8px',
                            lineHeight: '1.4',
                          }}
                        >
                          {webinar.title}
                        </h3>

                        {/* Next Session */}
                        {nextSession && !isCompleted && (
                          <div
                            style={{
                              padding: '10px 12px',
                              background: '#f7fafc',
                              borderRadius: '6px',
                              marginBottom: '12px',
                              fontSize: '13px',
                            }}
                          >
                            <span style={{ color: '#666' }}>Next: </span>
                            <span style={{ fontWeight: '600', color: 'var(--color-primary)' }}>
                              {formatDate(nextSession.startTime)}
                            </span>
                          </div>
                        )}

                        {isCompleted && (
                          <div
                            style={{
                              padding: '10px 12px',
                              background: '#f7fafc',
                              borderRadius: '6px',
                              marginBottom: '12px',
                              fontSize: '13px',
                              color: '#666',
                            }}
                          >
                            Completed - Recording available
                          </div>
                        )}

                        {/* Meta */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingTop: '12px',
                            borderTop: '1px solid #e2e8f0',
                            fontSize: '13px',
                            color: '#666',
                          }}
                        >
                          <span>
                            Registered {formatDate(webinar.registration?.registeredAt || '')}
                          </span>
                          <span style={{ fontWeight: '600', color: '#333' }}>
                            {webinar.price === 0
                              ? 'Free'
                              : formatPrice(webinar.price, webinar.currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              }
            })}
          </div>
        ) : (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              padding: '60px',
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🛒</div>
            <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
              No purchases yet
            </h3>
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Browse courses and live sessions to get started
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <Link
                href="/#courses"
                style={{
                  padding: '12px 24px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                }}
              >
                Browse Courses
              </Link>
              <Link
                href="/#webinars"
                style={{
                  padding: '12px 24px',
                  background: '#fff',
                  color: 'var(--color-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  border: '1px solid var(--color-primary)',
                }}
              >
                Browse Live Sessions
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
