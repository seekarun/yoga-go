'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

/* eslint-disable @typescript-eslint/no-explicit-any -- Admin page accesses dynamic expert/user/course properties */
interface ExpertData {
  expert: Record<string, any>;
  user: Record<string, any>;
  courses: Record<string, any>[];
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function ExpertDetailsPage() {
  const { user: currentUser, isAdmin } = useAuth();
  const router = useRouter();
  const params = useParams();
  const expertId = params.expertId as string;
  const [expertData, setExpertData] = useState<ExpertData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/app');
      return;
    }

    const fetchExpert = async () => {
      try {
        const response = await fetch(`/data/admn/experts/${expertId}`);
        const data = await response.json();
        if (data.success) {
          setExpertData(data.data);
        }
      } catch (error) {
        console.error('[DBG][admn/experts/expertId] Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchExpert();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- isAdmin check intentionally omitted, checked inside effect
  }, [currentUser, expertId, router]);

  if (loading) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
      </div>
    );
  }

  if (!expertData) {
    return (
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>Expert not found</div>
      </div>
    );
  }

  const { expert, user, courses } = expertData;

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
                background: expert.avatar ? `url(${expert.avatar})` : '#667eea',
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
              {!expert.avatar && expert.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {expert.name}
              </h1>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '4px' }}>
                {expert.title}
              </p>
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
            {/* Expert Profile */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>
                Expert Profile
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Name
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {expert.name}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Title
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {expert.title}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Experience
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {expert.experience || 'N/A'}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Featured
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {expert.featured ? 'Yes ⭐' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            {/* Account Information */}
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px' }}>Account</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                    Member Since
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {new Date(user.profile.joinedAt).toLocaleDateString()}
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
                    {expert.totalCourses}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Total Students
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {expert.totalStudents}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    Rating
                  </div>
                  <div style={{ fontSize: '14px', color: '#2d3748', fontWeight: '500' }}>
                    {expert.rating} ⭐
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {expert.bio && (
            <div
              style={{
                marginTop: '24px',
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>Bio</h3>
              <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: '1.6' }}>{expert.bio}</p>
            </div>
          )}

          {/* Specializations */}
          {expert.specializations && expert.specializations.length > 0 && (
            <div
              style={{
                marginTop: '24px',
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                Specializations
              </h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {expert.specializations.map((spec: string, index: number) => (
                  <span
                    key={index}
                    style={{
                      padding: '6px 16px',
                      background: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Courses */}
          {courses && courses.length > 0 && (
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
                Courses ({courses.length})
              </h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '16px',
                }}
              >
                {courses.map(course => (
                  <div
                    key={course.id}
                    style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '8px',
                      }}
                    >
                      <div style={{ fontSize: '14px', fontWeight: '600', flex: 1 }}>
                        {course.title}
                      </div>
                      <span
                        style={{
                          padding: '2px 8px',
                          background: course.status === 'PUBLISHED' ? '#d1fae5' : '#fee2e2',
                          color: course.status === 'PUBLISHED' ? '#065f46' : '#991b1b',
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: '600',
                        }}
                      >
                        {course.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                      Students: {course.totalStudents}
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                      Rating: {course.rating} ⭐
                    </div>
                    <div style={{ fontSize: '12px', color: '#718096' }}>Price: ₹{course.price}</div>
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
