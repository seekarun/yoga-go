'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getClientExpertContext } from '@/lib/domainContext';
import type { UserCoursesData } from '@/types';
import CourseCard from '@/components/CourseCard';
import ExpertDashboard from '@/components/learner-dashboard/ExpertDashboard';

export default function Dashboard() {
  const { user, isAuthenticated, isExpert } = useAuth();
  const router = useRouter();
  const [userCourses, setUserCourses] = useState<UserCoursesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expertContext, setExpertContext] = useState<{
    isExpertMode: boolean;
    expertId: string | null;
  }>({ isExpertMode: false, expertId: null });

  // Detect expert subdomain context
  useEffect(() => {
    const context = getClientExpertContext();
    setExpertContext({
      isExpertMode: context.isExpertMode,
      expertId: context.expertId,
    });
    console.log('[DBG][app/page] Expert context:', context.isExpertMode, context.expertId);
  }, []);

  // Clean up auth_token parameter from URL after OAuth callback
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('auth_token')) {
      console.log('[DBG][app/page] Cleaning up auth_token parameter');
      url.searchParams.delete('auth_token');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  // Redirect experts to /srv, UNLESS:
  // 1. They explicitly want to view their learning dashboard (?view=learning)
  // 2. They are on another expert's subdomain (treated as learner there)
  useEffect(() => {
    const url = new URL(window.location.href);
    const isLearningView =
      url.searchParams.has('view') && url.searchParams.get('view') === 'learning';

    // On expert subdomains, users with expert role should NOT be redirected to /srv
    // They are learners on other expert's sites
    const isOnOtherExpertSubdomain = expertContext.isExpertMode;

    if (isExpert && !isLearningView && !isOnOtherExpertSubdomain) {
      console.log('[DBG][app/page] User is expert on main domain, redirecting to /srv');
      router.push('/srv');
    } else if (isExpert && isLearningView) {
      console.log('[DBG][app/page] Expert viewing learning dashboard');
    } else if (isExpert && isOnOtherExpertSubdomain) {
      console.log('[DBG][app/page] Expert on other expert subdomain, staying on /app as learner');
    }
  }, [isExpert, router, expertContext.isExpertMode]);

  useEffect(() => {
    const fetchUserCourses = async () => {
      try {
        console.log('[DBG][dashboard] Fetching user courses...');
        setLoading(true);
        // Add timestamp to prevent caching
        const response = await fetch(`/data/app/courses?t=${Date.now()}`);
        const data = await response.json();

        if (data.success) {
          console.log(
            '[DBG][dashboard] Received',
            data.data.enrolled?.length || 0,
            'enrolled courses'
          );
          setUserCourses(data.data);
        } else {
          console.error('[DBG][dashboard] Failed to fetch courses:', data.error);
        }
      } catch (error) {
        console.error('[DBG][dashboard] Error fetching user courses:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated) {
      fetchUserCourses();
    }
  }, [isAuthenticated, user?.id]); // Also refetch when user ID changes

  if (!user) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
      </div>
    );
  }

  // On expert subdomain, show the themed expert dashboard
  if (expertContext.isExpertMode && expertContext.expertId) {
    return <ExpertDashboard expertId={expertContext.expertId} />;
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const enrolledCourses = userCourses?.enrolled || [];
  // Show all enrolled courses including completed ones
  const displayCourses = enrolledCourses;

  console.log('[DBG][dashboard] Total enrolled:', enrolledCourses.length);
  console.log('[DBG][dashboard] Displaying:', displayCourses.length);

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh' }}>
      {/* Compact Stats Bar */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
          color: '#fff',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontSize: '18px', fontWeight: '500' }}>
            Hi {user.profile?.name?.split(' ')[0] || user.profile.email.split('@')[0] || 'User'}{' '}
            <span role="img" aria-label="wave">
              👋
            </span>
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}
              title={`Day Streak: ${user.statistics.currentStreak} days`}
            >
              <span role="img" aria-label="streak">
                🔥
              </span>
              <span style={{ fontWeight: '600' }}>{user.statistics.currentStreak}</span>
            </div>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}
              title={`Total Practice Time: ${formatTime(user.statistics.totalPracticeTime)}`}
            >
              <span role="img" aria-label="time">
                🕐
              </span>
              <span style={{ fontWeight: '600' }}>
                {formatTime(user.statistics.totalPracticeTime)}
              </span>
            </div>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}
              title={`Courses Completed: ${user.statistics.completedCourses}`}
            >
              <span role="img" aria-label="completed">
                🏁
              </span>
              <span style={{ fontWeight: '600' }}>{user.statistics.completedCourses}</span>
            </div>

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'default' }}
              title={`Achievements Earned: ${user.achievements.length}`}
            >
              <span role="img" aria-label="achievements">
                🏆
              </span>
              <span style={{ fontWeight: '600' }}>{user.achievements.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Continue Learning Section */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '32px',
            }}
          >
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '600',
                marginBottom: '8px',
              }}
            >
              Your Courses
            </h2>
            {displayCourses.length > 0 && (
              <Link
                href="/app/my-courses"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                View All →
              </Link>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '16px', color: '#666' }}>Loading your courses...</div>
            </div>
          ) : displayCourses.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '24px',
              }}
            >
              {displayCourses.map(course => (
                <CourseCard key={course.id} course={course} variant="enrolled" />
              ))}
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
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📚</div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>
                No courses enrolled
              </h3>
              <p style={{ color: '#666', marginBottom: '24px' }}>
                Start your yoga journey by enrolling in a course
              </p>
              <Link
                href="/courses"
                style={{
                  padding: '12px 24px',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
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

      {/* Recent Achievements */}
      {user.achievements.length > 0 && (
        <section style={{ padding: '60px 20px', background: '#fff' }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <h2
              style={{
                fontSize: '28px',
                fontWeight: '600',
                marginBottom: '32px',
                textAlign: 'center',
              }}
            >
              Recent Achievements
            </h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '24px',
              }}
            >
              {user.achievements.slice(0, 4).map(achievement => (
                <div
                  key={achievement.id}
                  style={{
                    background: '#f8f8f8',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    border: '2px solid #e2e8f0',
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '12px' }}>{achievement.icon}</div>
                  <h3
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    {achievement.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#666',
                      lineHeight: '1.4',
                    }}
                  >
                    {achievement.description}
                  </p>
                </div>
              ))}
            </div>
            {user.achievements.length > 4 && (
              <div style={{ textAlign: 'center', marginTop: '24px' }}>
                <Link
                  href="/app/achievements"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  View All Achievements →
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
