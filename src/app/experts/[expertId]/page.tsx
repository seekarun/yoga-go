'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Expert, Course } from '@/types';

export default function ExpertDetailPage() {
  const params = useParams();
  const expertId = params.expertId as string;
  const [expert, setExpert] = useState<Expert | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExpertData = async () => {
      try {
        console.log('[DBG][expert-detail] Fetching expert:', expertId);

        // Fetch expert details
        const expertRes = await fetch(`/data/experts/${expertId}`);
        const expertData = await expertRes.json();

        if (expertData.success) {
          setExpert(expertData.data);
          console.log('[DBG][expert-detail] Expert loaded:', expertData.data);
        }

        // Fetch all courses and filter by expert
        const coursesRes = await fetch('/data/courses');
        const coursesData = await coursesRes.json();

        if (coursesData.success && expertData.success) {
          // Filter courses by this expert
          const expertCourses = coursesData.data.filter(
            (course: Course) => course.instructor?.name === expertData.data.name
          );
          setCourses(expertCourses);
          console.log('[DBG][expert-detail] Expert courses:', expertCourses);
        }
      } catch (error) {
        console.error('[DBG][expert-detail] Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchExpertData();
    }
  }, [expertId]);

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
        <div style={{ fontSize: '16px', color: '#666' }}>Loading expert profile...</div>
      </div>
    );
  }

  if (!expert) {
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Expert not found</h2>
          <Link
            href="/experts"
            style={{
              color: '#764ba2',
              textDecoration: 'underline',
            }}
          >
            View all experts
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh' }}>
      {/* Hero Section with Banner */}
      <section
        style={{
          height: '400px',
          position: 'relative',
          backgroundImage: `url(${expert.avatar})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.4)',
          }}
        />

        <div
          className="container"
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '60px 20px',
            color: '#fff',
          }}
        >
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '600',
              marginBottom: '16px',
            }}
          >
            {expert.name}
          </h1>
          <p
            style={{
              fontSize: '24px',
              marginBottom: '24px',
              opacity: 0.95,
            }}
          >
            {expert.title}
          </p>
          <div
            style={{
              display: 'flex',
              gap: '32px',
              flexWrap: 'wrap',
              fontSize: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#FFD700', fontSize: '20px' }}>★</span>
              <span>{expert.rating} Rating</span>
            </div>
            <div>{expert.totalStudents.toLocaleString()} Students</div>
            <div>{expert.totalCourses} Courses</div>
          </div>
        </div>
      </section>

      {/* Bio Section */}
      <section
        style={{
          padding: '60px 0',
          background: '#fff',
        }}
      >
        <div className="container" style={{ padding: '0 20px' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '24px',
            }}
          >
            About {expert.name}
          </h2>
          <p
            style={{
              fontSize: '18px',
              lineHeight: '1.8',
              color: '#4a5568',
              maxWidth: '800px',
            }}
          >
            {expert.bio}
          </p>

          {/* Specializations */}
          {expert.specializations && expert.specializations.length > 0 && (
            <>
              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginTop: '40px',
                  marginBottom: '20px',
                }}
              >
                Specializations
              </h3>
              <div
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {expert.specializations.map((spec, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '10px 24px',
                      background: '#f7fafc',
                      borderRadius: '100px',
                      fontSize: '16px',
                      color: '#4a5568',
                      border: '1px solid #e2e8f0',
                    }}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Courses Section */}
      <section
        style={{
          padding: '60px 0',
          background: '#f8f8f8',
        }}
      >
        <div className="container" style={{ padding: '0 20px' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '32px',
            }}
          >
            Courses by {expert.name}
          </h2>

          {courses.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
              }}
            >
              {courses.map(course => (
                <Link
                  key={course.id}
                  href={`/courses/${course.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      transition: 'all 0.2s',
                      cursor: 'pointer',
                      height: '100%',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#666',
                        marginBottom: '8px',
                      }}
                    >
                      {course.level} • {course.duration}
                    </div>
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: '600',
                        marginBottom: '12px',
                      }}
                    >
                      {course.title}
                    </h3>
                    <p
                      style={{
                        color: '#666',
                        marginBottom: '20px',
                        lineHeight: '1.6',
                      }}
                    >
                      {course.description}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span style={{ color: '#FFB800' }}>★</span>
                        <span style={{ fontWeight: '600' }}>{course.rating}</span>
                        <span style={{ color: '#666', fontSize: '14px' }}>
                          ({course.totalStudents})
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '24px',
                          fontWeight: '600',
                        }}
                      >
                        ${course.price}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: '#fff',
                borderRadius: '12px',
              }}
            >
              <p style={{ fontSize: '18px', color: '#666' }}>
                No courses available from this instructor yet.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: '80px 20px',
          background: '#000',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '36px',
            fontWeight: '600',
            marginBottom: '16px',
          }}
        >
          Ready to Start Learning?
        </h2>
        <p
          style={{
            fontSize: '20px',
            opacity: 0.9,
            marginBottom: '32px',
            maxWidth: '600px',
            margin: '0 auto 32px',
          }}
        >
          Join thousands of students learning from {expert.name}
        </p>
        <Link
          href="/courses"
          style={{
            display: 'inline-block',
            padding: '14px 40px',
            background: '#fff',
            color: '#000',
            borderRadius: '100px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '16px',
          }}
        >
          Browse All Courses
        </Link>
      </section>
    </div>
  );
}
