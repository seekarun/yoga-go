'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import type { UserCoursesData } from '@/types';
import CourseCard from '@/components/CourseCard';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [userCourses, setUserCourses] = useState<UserCoursesData | null>(null);
  const [loading, setLoading] = useState(true);

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
      {/* Welcome Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '60px 20px',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: user.profile.avatar ? `url(${user.profile.avatar})` : '#fff',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#764ba2',
              }}
            >
              {!user.profile.avatar && user.profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1
                style={{
                  fontSize: '36px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Welcome back, {user.profile.name.split(' ')[0]}! 🧘‍♀️
              </h1>
              <p style={{ fontSize: '18px', opacity: 0.9 }}>Ready to continue your yoga journey?</p>
            </div>
          </div>

          {/* Quick Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '24px',
            }}
          >
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {user.statistics.currentStreak}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Day Streak 🔥</div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {formatTime(user.statistics.totalPracticeTime)}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Practice Time</div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {user.statistics.completedCourses}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Courses Completed</div>
            </div>
            <div
              style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
                {user.achievements.length}
              </div>
              <div style={{ fontSize: '14px', opacity: 0.9 }}>Achievements</div>
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
                  color: '#764ba2',
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
                  background: '#764ba2',
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
                    color: '#764ba2',
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
