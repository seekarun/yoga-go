'use client';

import CourseCard from '@/components/CourseCard';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import { useAuth } from '@/contexts/AuthContext';
import type { Post, Course, Expert, UserCourseData, Webinar, WebinarSession } from '@/types';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import ThemeBridge from './ThemeBridge';

interface ExpertDashboardProps {
  expertId: string;
}

interface WebinarWithRegistration extends Webinar {
  registration: {
    id: string;
    registeredAt: string;
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getNextSession(sessions: WebinarSession[]): WebinarSession | null {
  const now = new Date().toISOString();
  const upcomingSessions = sessions
    .filter(s => s.startTime >= now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  return upcomingSessions[0] || null;
}

function isLiveNow(session: WebinarSession): boolean {
  const now = new Date();
  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  return now >= start && now <= end;
}

export default function ExpertDashboard({ expertId }: ExpertDashboardProps) {
  const { user } = useAuth();
  const [expert, setExpert] = useState<Expert | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<UserCourseData[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [webinars, setWebinars] = useState<WebinarWithRegistration[]>([]);
  const [blogPosts, setBlogPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Fetch expert data and theme
  useEffect(() => {
    const fetchExpert = async () => {
      try {
        console.log('[DBG][ExpertDashboard] Fetching expert:', expertId);
        const response = await fetch(`/data/experts/${expertId}`);
        const data = await response.json();
        if (data.success) {
          setExpert(data.data);
        }
      } catch (error) {
        console.error('[DBG][ExpertDashboard] Error fetching expert:', error);
      }
    };

    fetchExpert();
  }, [expertId]);

  // Fetch user's enrolled courses and available courses
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('[DBG][ExpertDashboard] Fetching courses for expert:', expertId);

        // Fetch enrolled courses
        const enrolledResponse = await fetch(`/data/app/courses?t=${Date.now()}`);
        const enrolledData = await enrolledResponse.json();
        let expertEnrolledCourses: UserCourseData[] = [];
        if (enrolledData.success && enrolledData.data.enrolled) {
          expertEnrolledCourses = enrolledData.data.enrolled.filter(
            (course: UserCourseData) => course.instructor?.id === expertId
          );
          setEnrolledCourses(expertEnrolledCourses);
          console.log(
            '[DBG][ExpertDashboard] Found',
            expertEnrolledCourses.length,
            'enrolled courses from this expert'
          );
        }

        // Fetch available courses from this expert (uses x-expert-id header automatically)
        const availableResponse = await fetch('/data/courses');
        const availableData = await availableResponse.json();
        if (availableData.success) {
          // Filter out courses user is already enrolled in
          const enrolledIds = new Set(expertEnrolledCourses.map(c => c.id));
          const notEnrolledCourses = availableData.data.filter(
            (course: Course) => !enrolledIds.has(course.id)
          );
          setAvailableCourses(notEnrolledCourses);
          console.log(
            '[DBG][ExpertDashboard] Found',
            notEnrolledCourses.length,
            'available courses from this expert'
          );
        }
      } catch (error) {
        console.error('[DBG][ExpertDashboard] Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [expertId]);

  // Fetch available webinars from this expert + user's registrations
  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        console.log('[DBG][ExpertDashboard] Fetching webinars for expert:', expertId);

        // Fetch available webinars from this expert (public endpoint)
        // The x-expert-id header is set automatically by middleware on subdomains
        const availableResponse = await fetch('/data/webinars');
        const availableData = await availableResponse.json();

        // Fetch user's registered webinars
        const registeredResponse = await fetch('/data/app/webinars');
        const registeredData = await registeredResponse.json();

        // Create a map of registered webinar IDs
        const registeredMap = new Map<string, WebinarWithRegistration>();
        if (registeredData.success && registeredData.data) {
          registeredData.data
            .filter((w: WebinarWithRegistration) => w.expertId === expertId)
            .forEach((w: WebinarWithRegistration) => registeredMap.set(w.id, w));
        }

        // Merge available and registered webinars
        // Registered webinars have the registration info, available ones don't
        const allWebinars: WebinarWithRegistration[] = [];
        if (availableData.success && availableData.data) {
          for (const webinar of availableData.data) {
            const registered = registeredMap.get(webinar.id);
            if (registered) {
              // Use registered version (has registration info)
              allWebinars.push(registered);
              registeredMap.delete(webinar.id);
            } else {
              // Not registered yet - add without registration
              allWebinars.push(webinar as WebinarWithRegistration);
            }
          }
        }

        // Add any registered webinars that weren't in available list (shouldn't happen but just in case)
        for (const registered of registeredMap.values()) {
          allWebinars.push(registered);
        }

        setWebinars(allWebinars);
        console.log(
          '[DBG][ExpertDashboard] Found',
          allWebinars.length,
          'webinars from this expert'
        );
      } catch (error) {
        console.error('[DBG][ExpertDashboard] Error fetching webinars:', error);
      }
    };

    fetchWebinars();
  }, [expertId]);

  // Fetch blog posts from this expert
  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        console.log('[DBG][ExpertDashboard] Fetching blog posts for expert:', expertId);
        const response = await fetch(`/data/experts/${expertId}/blog?limit=3`);
        const data = await response.json();
        if (data.success) {
          setBlogPosts(data.data);
          console.log('[DBG][ExpertDashboard] Found', data.data.length, 'blog posts');
        }
      } catch (error) {
        console.error('[DBG][ExpertDashboard] Error fetching blog posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, [expertId]);

  const palette = expert?.customLandingPage?.theme?.palette;
  const expertName = expert?.name || 'Expert';

  if (!user) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  // Get upcoming webinars (those with future sessions)
  const now = new Date().toISOString();
  const upcomingWebinars = webinars.filter(w => w.sessions.some(s => s.startTime >= now));

  return (
    <LandingPageThemeProvider palette={palette}>
      <ThemeBridge>
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
          {/* Welcome Banner */}
          <section
            style={{
              background: 'var(--color-primary)',
              color: '#fff',
              padding: '24px 20px',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
              }}
            >
              <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
                Welcome back, {user.profile?.name?.split(' ')[0] || 'there'}!
              </h1>
              <p style={{ fontSize: '14px', opacity: 0.9 }}>
                Continue your learning journey with {expertName}
              </p>
            </div>
          </section>

          {/* Courses Section */}
          <section style={{ padding: '48px 20px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '16px', color: '#666' }}>Loading courses...</div>
                </div>
              ) : enrolledCourses.length > 0 ? (
                /* User has enrolled courses - show "Continue Learning" */
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <h2 style={{ fontSize: '22px', fontWeight: '600' }}>Continue Learning</h2>
                    <Link
                      href="/app/my-courses"
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      View All
                    </Link>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '24px',
                    }}
                  >
                    {enrolledCourses.slice(0, 4).map(course => (
                      <CourseCard key={course.id} course={course} variant="enrolled" />
                    ))}
                  </div>
                </>
              ) : availableCourses.length > 0 ? (
                /* User has no enrolled courses - show available courses */
                <>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '24px',
                    }}
                  >
                    <h2 style={{ fontSize: '22px', fontWeight: '600' }}>
                      Start Your Journey with {expertName}
                    </h2>
                    {availableCourses.length > 1 && (
                      <Link
                        href="/courses"
                        style={{
                          color: 'var(--color-primary)',
                          textDecoration: 'none',
                          fontSize: '14px',
                          fontWeight: '500',
                        }}
                      >
                        View All Courses
                      </Link>
                    )}
                  </div>

                  {/* Horizontal carousel for multiple courses */}
                  {availableCourses.length > 1 ? (
                    <div style={{ position: 'relative' }}>
                      {/* Scroll buttons */}
                      <button
                        onClick={() => {
                          if (carouselRef.current) {
                            carouselRef.current.scrollBy({ left: -340, behavior: 'smooth' });
                          }
                        }}
                        style={{
                          position: 'absolute',
                          left: '-16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                        aria-label="Scroll left"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#333"
                          strokeWidth="2"
                        >
                          <path d="M15 18l-6-6 6-6" />
                        </svg>
                      </button>
                      <div
                        ref={carouselRef}
                        style={{
                          display: 'flex',
                          gap: '20px',
                          overflowX: 'auto',
                          scrollSnapType: 'x mandatory',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          padding: '4px 0',
                        }}
                      >
                        {availableCourses.map(course => (
                          <div
                            key={course.id}
                            style={{
                              flex: '0 0 320px',
                              scrollSnapAlign: 'start',
                            }}
                          >
                            <CourseCard course={course} variant="full" />
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => {
                          if (carouselRef.current) {
                            carouselRef.current.scrollBy({ left: 340, behavior: 'smooth' });
                          }
                        }}
                        style={{
                          position: 'absolute',
                          right: '-16px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#fff',
                          border: '1px solid #e0e0e0',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          zIndex: 10,
                        }}
                        aria-label="Scroll right"
                      >
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#333"
                          strokeWidth="2"
                        >
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </button>
                      <style jsx>{`
                        div::-webkit-scrollbar {
                          display: none;
                        }
                      `}</style>
                    </div>
                  ) : (
                    /* Single course - show as grid */
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px',
                      }}
                    >
                      {availableCourses.map(course => (
                        <CourseCard key={course.id} course={course} variant="full" />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* No courses at all */
                <div
                  style={{
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '48px',
                    textAlign: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
                  <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                    No courses available yet
                  </h3>
                  <p style={{ color: '#666', fontSize: '14px' }}>
                    Check back soon for new courses from {expertName}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Upcoming Webinars Section */}
          {(upcomingWebinars.length > 0 || loading) && (
            <section style={{ padding: '48px 20px', background: '#fff' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <h2 style={{ fontSize: '22px', fontWeight: '600' }}>Upcoming Live Sessions</h2>
                  {upcomingWebinars.length > 0 && (
                    <Link
                      href="/app/webinars"
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      View All
                    </Link>
                  )}
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
                  </div>
                ) : upcomingWebinars.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    {upcomingWebinars.slice(0, 3).map(webinar => {
                      const nextSession = getNextSession(webinar.sessions);
                      const isLive = nextSession && isLiveNow(nextSession);

                      return (
                        <Link
                          key={webinar.id}
                          href={`/webinars/${webinar.id}`}
                          style={{
                            background: '#f8f8f8',
                            borderRadius: '12px',
                            padding: '20px',
                            textDecoration: 'none',
                            color: 'inherit',
                            display: 'block',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              marginBottom: '12px',
                            }}
                          >
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: '600',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                background: isLive ? '#ef4444' : 'var(--color-primary)',
                                color: '#fff',
                              }}
                            >
                              {isLive ? 'LIVE NOW' : 'UPCOMING'}
                            </span>
                            <span style={{ fontSize: '12px', color: '#666' }}>
                              {webinar.sessions.length} session
                              {webinar.sessions.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                            {webinar.title}
                          </h3>
                          {nextSession && (
                            <p style={{ fontSize: '14px', color: '#666' }}>
                              {formatDate(nextSession.startTime)} at{' '}
                              {formatTime(nextSession.startTime)}
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* Recent Blog Posts Section */}
          {(blogPosts.length > 0 || loading) && (
            <section style={{ padding: '48px 20px' }}>
              <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '24px',
                  }}
                >
                  <h2 style={{ fontSize: '22px', fontWeight: '600' }}>Latest from {expertName}</h2>
                  {blogPosts.length > 0 && (
                    <Link
                      href="/blog"
                      style={{
                        color: 'var(--color-primary)',
                        textDecoration: 'none',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                    >
                      View All Posts
                    </Link>
                  )}
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
                  </div>
                ) : blogPosts.length > 0 ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                      gap: '20px',
                    }}
                  >
                    {blogPosts.map(post => (
                      <Link
                        key={post.id}
                        href={`/blog/${post.id}`}
                        style={{
                          background: '#fff',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          textDecoration: 'none',
                          color: 'inherit',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                        }}
                      >
                        {post.media && post.media.length > 0 && post.media[0].type === 'image' && (
                          <div style={{ position: 'relative', height: '160px' }}>
                            <Image
                              src={post.media[0].url}
                              alt="Post media"
                              fill
                              style={{ objectFit: 'cover' }}
                            />
                          </div>
                        )}
                        <div style={{ padding: '16px' }}>
                          {post.content && (
                            <p
                              style={{
                                fontSize: '14px',
                                color: '#333',
                                lineHeight: '1.5',
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {post.content}
                            </p>
                          )}
                          <p style={{ fontSize: '12px', color: '#999', marginTop: '12px' }}>
                            {new Date(
                              post.publishedAt || post.createdAt || Date.now()
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>
          )}

          {/* Empty State - No Content at all */}
          {!loading &&
            enrolledCourses.length === 0 &&
            availableCourses.length === 0 &&
            upcomingWebinars.length === 0 &&
            blogPosts.length === 0 && (
              <section style={{ padding: '48px 20px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '24px' }}>🧘</div>
                  <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                    Coming Soon
                  </h2>
                  <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
                    {expertName} is preparing amazing content. Check back soon!
                  </p>
                </div>
              </section>
            )}
        </div>
      </ThemeBridge>
    </LandingPageThemeProvider>
  );
}
