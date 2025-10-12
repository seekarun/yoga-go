'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Course, Lesson } from '@/types';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourseData = async () => {
      try {
        console.log('[DBG][course-detail] Fetching course:', courseId);

        // Fetch course details
        const courseRes = await fetch(`/data/courses/${courseId}`);
        const courseData = await courseRes.json();

        if (courseData.success) {
          setCourse(courseData.data);
          console.log('[DBG][course-detail] Course loaded:', courseData.data);
        } else {
          console.error('[DBG][course-detail] Failed to load course:', courseData.error);
        }
      } catch (error) {
        console.error('[DBG][course-detail] Error fetching course:', error);
      } finally {
        setLoading(false);
      }
    };

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId]);

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
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #764ba2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '16px', color: '#666' }}>Loading course...</div>
        </div>
      </div>
    );
  }

  if (!course) {
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Course not found</h2>
          <Link
            href="/courses"
            style={{
              color: '#764ba2',
              textDecoration: 'underline',
            }}
          >
            View all courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Hero Section */}
      <section
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
            <Link href="/courses" style={{ color: '#764ba2', textDecoration: 'none' }}>
              Courses
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>{course.title}</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr',
              gap: '40px',
              alignItems: 'start',
            }}
          >
            <div>
              {/* Badges */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                {course.isNew && (
                  <span
                    style={{
                      padding: '6px 12px',
                      background: '#48bb78',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    NEW
                  </span>
                )}
                {course.featured && (
                  <span
                    style={{
                      padding: '6px 12px',
                      background: '#764ba2',
                      color: '#fff',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    FEATURED
                  </span>
                )}
                <span
                  style={{
                    padding: '6px 12px',
                    background: '#f7fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#764ba2',
                    fontWeight: '600',
                  }}
                >
                  {course.category}
                </span>
                <span
                  style={{
                    padding: '6px 12px',
                    background: '#f7fafc',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#4a5568',
                  }}
                >
                  {course.level}
                </span>
              </div>

              <h1
                style={{
                  fontSize: '48px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  lineHeight: '1.2',
                }}
              >
                {course.title}
              </h1>

              <p
                style={{
                  fontSize: '20px',
                  color: '#4a5568',
                  lineHeight: '1.6',
                  marginBottom: '24px',
                }}
              >
                {course.description}
              </p>

              {/* Instructor */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '24px',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundImage: `url(${course.instructor.avatar || '/images/default-avatar.jpg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600' }}>
                    {course.instructor.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{course.instructor.title}</div>
                </div>
              </div>

              {/* Stats */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  flexWrap: 'wrap',
                  marginBottom: '32px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: '#FFB800', fontSize: '20px' }}>★</span>
                  <span style={{ fontSize: '16px', fontWeight: '600' }}>{course.rating}</span>
                  <span style={{ fontSize: '14px', color: '#666' }}>
                    ({course.totalRatings || 0} ratings)
                  </span>
                </div>
                <div style={{ fontSize: '16px', color: '#666' }}>
                  {course.totalStudents.toLocaleString()} students
                </div>
                <div style={{ fontSize: '16px', color: '#666' }}>{course.totalLessons} lessons</div>
                <div style={{ fontSize: '16px', color: '#666' }}>{course.duration}</div>
              </div>

              {/* Price and CTA */}
              <div
                style={{
                  padding: '24px',
                  background: '#f7fafc',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div>
                    <div style={{ fontSize: '36px', fontWeight: '600', color: '#764ba2' }}>
                      ${course.price}
                    </div>
                    {course.freeLessons > 0 && (
                      <div style={{ fontSize: '14px', color: '#48bb78', marginTop: '4px' }}>
                        {course.freeLessons} free preview lessons
                      </div>
                    )}
                  </div>
                  <button
                    style={{
                      padding: '16px 32px',
                      background: '#764ba2',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#5a3a82';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#764ba2';
                    }}
                  >
                    Enroll Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Course Thumbnail */}
      {course.thumbnail && (
        <section
          style={{
            background: '#fff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                height: '400px',
                backgroundImage: `url(${course.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                borderRadius: '12px',
              }}
            />
          </div>
        </section>
      )}

      <div
        className="container"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}>
          {/* Main Content */}
          <div>
            {/* What You'll Learn */}
            {course.whatYouWillLearn && course.whatYouWillLearn.length > 0 && (
              <section
                style={{
                  background: '#fff',
                  padding: '32px',
                  borderRadius: '12px',
                  marginBottom: '32px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    marginBottom: '20px',
                  }}
                >
                  What You&apos;ll Learn
                </h2>
                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {course.whatYouWillLearn.map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: '12px 0',
                        borderBottom:
                          idx < course.whatYouWillLearn!.length - 1 ? '1px solid #e2e8f0' : 'none',
                        display: 'flex',
                        alignItems: 'start',
                        gap: '12px',
                      }}
                    >
                      <span style={{ color: '#48bb78', fontSize: '20px', marginTop: '2px' }}>
                        ✓
                      </span>
                      <span style={{ fontSize: '16px', lineHeight: '1.6', color: '#4a5568' }}>
                        {item}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Description */}
            <section
              style={{
                background: '#fff',
                padding: '32px',
                borderRadius: '12px',
                marginBottom: '32px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h2
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '20px',
                }}
              >
                About This Course
              </h2>
              <p
                style={{
                  fontSize: '16px',
                  lineHeight: '1.8',
                  color: '#4a5568',
                }}
              >
                {course.longDescription || course.description}
              </p>
            </section>

            {/* Curriculum */}
            {course.curriculum && course.curriculum.length > 0 && (
              <section
                style={{
                  background: '#fff',
                  padding: '32px',
                  borderRadius: '12px',
                  marginBottom: '32px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <h2
                  style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    marginBottom: '20px',
                  }}
                >
                  Course Curriculum
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {course.curriculum.map((week, idx) => (
                    <div
                      key={idx}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '16px 20px',
                          background: '#f7fafc',
                          borderBottom: '1px solid #e2e8f0',
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '16px' }}>
                          Week {week.week}: {week.title}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                          {week.lessons?.length || 0} lessons
                        </div>
                      </div>
                      {week.lessons && week.lessons.length > 0 && (
                        <div>
                          {week.lessons.map((lesson: Lesson, lessonIdx: number) => (
                            <div
                              key={lessonIdx}
                              style={{
                                padding: '16px 20px',
                                borderBottom:
                                  lessonIdx < week.lessons!.length - 1
                                    ? '1px solid #e2e8f0'
                                    : 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '20px' }}>
                                  {lesson.isFree ? '▶️' : '🔒'}
                                </span>
                                <div>
                                  <div style={{ fontSize: '15px', fontWeight: '500' }}>
                                    {lesson.title}
                                  </div>
                                  {lesson.isFree && (
                                    <span
                                      style={{
                                        fontSize: '12px',
                                        color: '#48bb78',
                                        fontWeight: '600',
                                      }}
                                    >
                                      FREE PREVIEW
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div style={{ fontSize: '14px', color: '#666' }}>
                                {lesson.duration}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Requirements */}
            {course.requirements && course.requirements.length > 0 && (
              <section
                style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '16px',
                  }}
                >
                  Requirements
                </h3>
                <ul
                  style={{
                    listStyle: 'disc',
                    paddingLeft: '20px',
                    margin: 0,
                  }}
                >
                  {course.requirements.map((req, idx) => (
                    <li
                      key={idx}
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#4a5568',
                        marginBottom: '8px',
                      }}
                    >
                      {req}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <section
                style={{
                  background: '#fff',
                  padding: '24px',
                  borderRadius: '12px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    marginBottom: '16px',
                  }}
                >
                  Tags
                </h3>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {course.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      style={{
                        padding: '6px 12px',
                        background: '#f7fafc',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#4a5568',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Instructor Card */}
            <section
              style={{
                background: '#fff',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  marginBottom: '16px',
                }}
              >
                Instructor
              </h3>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundImage: `url(${course.instructor.avatar || '/images/default-avatar.jpg'})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    margin: '0 auto 16px',
                  }}
                />
                <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                  {course.instructor.name}
                </div>
                <div style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  {course.instructor.title}
                </div>
                <Link
                  href={`/experts/${course.instructor.id}`}
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: '#f7fafc',
                    color: '#764ba2',
                    borderRadius: '6px',
                    textDecoration: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                  }}
                >
                  View Profile
                </Link>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
