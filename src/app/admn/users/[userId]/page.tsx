'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import type { User } from '@/types';

export default function UserDetailsPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/app');
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`/data/admn/users/${userId}`);
        const data = await response.json();
        if (data.success) {
          setUser(data.data);
        }
      } catch (error) {
        console.error('[DBG][admn/users/userId] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [currentUser, userId, router]);

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>User not found</div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f7fafc' }}>
      {/* Header */}
      <section
        style={{ background: '#fff', padding: '24px 20px', borderBottom: '1px solid #e2e8f0' }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Link
            href="/admn"
            style={{
              fontSize: '14px',
              color: 'var(--color-primary)',
              textDecoration: 'none',
              marginBottom: '16px',
              display: 'inline-block',
            }}
          >
            ← Back to Dashboard
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: user.profile.avatar ? `url(${user.profile.avatar})` : '#667eea',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '32px',
                fontWeight: '600',
              }}
            >
              {!user.profile.avatar && user.profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {user.profile.name}
              </h1>
              <p style={{ fontSize: '14px', color: '#718096' }}>{user.profile.email}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Details */}
      <section style={{ padding: '40px 20px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Profile Information */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Profile Information
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Name
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {user.profile.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Email
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {user.profile.email}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Role
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {user.role}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Member Since
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {new Date(user.profile.joinedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Membership */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Membership
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Type
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#2d3748',
                      fontWeight: '500',
                      textTransform: 'capitalize',
                    }}
                  >
                    {user.membership.type}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Status
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      background: user.membership.status === 'active' ? '#d1fae5' : '#fee2e2',
                      color: user.membership.status === 'active' ? '#065f46' : '#991b1b',
                    }}
                  >
                    {user.membership.status}
                  </span>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Start Date
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {new Date(user.membership.startDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Statistics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Total Courses
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {user.statistics.totalCourses}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Completed Courses
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {user.statistics.completedCourses}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Current Streak
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {user.statistics.currentStreak} days
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Total Practice Time
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {Math.floor(user.statistics.totalPracticeTime / 60)}h{' '}
                    {user.statistics.totalPracticeTime % 60}m
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enrolled Courses */}
          {user.enrolledCourses && user.enrolledCourses.length > 0 && (
            <div
              style={{
                marginTop: '24px',
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Enrolled Courses ({user.enrolledCourses.length})
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {user.enrolledCourses.map(course => (
                  <div
                    key={course.courseId}
                    style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
                      {course.title}
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                      Instructor: {course.instructor}
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '8px' }}>
                      Progress: {course.progress}%
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: '4px',
                        background: '#e2e8f0',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${course.progress}%`,
                          height: '100%',
                          background: 'var(--color-primary)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
