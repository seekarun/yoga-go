'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import ThemeBridge from './ThemeBridge';
import CourseCard from '@/components/CourseCard';
import type { UserCourseData, Expert, BlogPost, Webinar, WebinarSession } from '@/types';

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
  const [courses, setCourses] = useState<UserCourseData[]>([]);
  const [webinars, setWebinars] = useState<WebinarWithRegistration[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch user's courses, filter by this expert
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        console.log('[DBG][ExpertDashboard] Fetching courses for expert:', expertId);
        const response = await fetch(`/data/app/courses?t=${Date.now()}`);
        const data = await response.json();
        if (data.success && data.data.enrolled) {
          // Filter to only this expert's courses
          const expertCourses = data.data.enrolled.filter(
            (course: UserCourseData) => course.instructor?.id === expertId
          );
          setCourses(expertCourses);
          console.log(
            '[DBG][ExpertDashboard] Found',
            expertCourses.length,
            'courses from this expert'
          );
        }
      } catch (error) {
        console.error('[DBG][ExpertDashboard] Error fetching courses:', error);
      }
    };

    fetchCourses();
  }, [expertId]);

  // Fetch user's webinars, filter by this expert
  useEffect(() => {
    const fetchWebinars = async () => {
      try {
        console.log('[DBG][ExpertDashboard] Fetching webinars for expert:', expertId);
        const response = await fetch('/data/app/webinars');
        const data = await response.json();
        if (data.success) {
          // Filter to only this expert's webinars
          const expertWebinars = data.data.filter(
            (webinar: WebinarWithRegistration) => webinar.expertId === expertId
          );
          setWebinars(expertWebinars);
          console.log(
            '[DBG][ExpertDashboard] Found',
            expertWebinars.length,
            'webinars from this expert'
          );
        }
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
              background:
                'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
              color: '#fff',
              padding: '24px 20px',
            }}
          >
            <div
              style={{
                maxWidth: '1200px',
                margin: '0 auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '4px' }}>
                  Welcome back, {user.profile?.name?.split(' ')[0] || 'there'}!
                </h1>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>
                  Continue your learning journey with {expertName}
                </p>
              </div>
              <Link
                href="/"
                style={{
                  padding: '10px 20px',
                  background: 'rgba(255,255,255,0.2)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                }}
              >
                View All Offerings
              </Link>
            </div>
          </section>

          {/* Enrolled Courses Section */}
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
                <h2 style={{ fontSize: '22px', fontWeight: '600' }}>Your Courses</h2>
                {courses.length > 0 && (
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
                )}
              </div>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{ fontSize: '16px', color: '#666' }}>Loading your courses...</div>
                </div>
              ) : courses.length > 0 ? (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '24px',
                  }}
                >
                  {courses.slice(0, 4).map(course => (
                    <CourseCard key={course.id} course={course} variant="enrolled" />
                  ))}
                </div>
              ) : (
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
                    No courses enrolled yet
                  </h3>
                  <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
                    Start your learning journey with {expertName}
                  </p>
                  <Link
                    href="/courses"
                    style={{
                      padding: '10px 20px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Browse Courses
                  </Link>
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
                        {post.coverImage && (
                          <div
                            style={{
                              height: '160px',
                              backgroundImage: `url(${post.coverImage})`,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                            }}
                          />
                        )}
                        <div style={{ padding: '20px' }}>
                          <h3
                            style={{
                              fontSize: '16px',
                              fontWeight: '600',
                              marginBottom: '8px',
                              lineHeight: '1.4',
                            }}
                          >
                            {post.title}
                          </h3>
                          {post.excerpt && (
                            <p
                              style={{
                                fontSize: '14px',
                                color: '#666',
                                lineHeight: '1.5',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {post.excerpt}
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

          {/* Empty State - No Content */}
          {!loading &&
            courses.length === 0 &&
            upcomingWebinars.length === 0 &&
            blogPosts.length === 0 && (
              <section style={{ padding: '48px 20px' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
                  <div style={{ fontSize: '64px', marginBottom: '24px' }}>🧘</div>
                  <h2 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                    Your Learning Journey Begins Here
                  </h2>
                  <p style={{ color: '#666', marginBottom: '24px', lineHeight: '1.6' }}>
                    Explore {expertName}&apos;s courses, live sessions, and blog posts to start your
                    transformation.
                  </p>
                  <Link
                    href="/"
                    style={{
                      padding: '14px 28px',
                      background: 'var(--color-primary)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-block',
                    }}
                  >
                    Explore Offerings
                  </Link>
                </div>
              </section>
            )}
        </div>
      </ThemeBridge>
    </LandingPageThemeProvider>
  );
}
