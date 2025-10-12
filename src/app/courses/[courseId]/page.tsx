'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { Course, Lesson } from '@/types';

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
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

        // Fetch lessons
        try {
          const lessonsRes = await fetch(`/data/courses/${courseId}/items`);
          const lessonsData = await lessonsRes.json();

          if (lessonsData.success) {
            setLessons(lessonsData.data || []);
            console.log('[DBG][course-detail] Lessons loaded:', lessonsData.data?.length || 0);
          }
        } catch (err) {
          console.error('[DBG][course-detail] Error fetching lessons:', err);
          // Don't fail if lessons can't be loaded
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
                  marginBottom: '24px',
                  lineHeight: '1.2',
                }}
              >
                {course.title}
              </h1>

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

              {/* Stats with Enroll Button */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  flexWrap: 'wrap',
                  alignItems: 'center',
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
                <button
                  style={{
                    padding: '12px 24px',
                    background: '#764ba2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    marginLeft: 'auto',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#5a3a82';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = '#764ba2';
                  }}
                >
                  Enroll Now - ${course.price}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promo Video Section */}
      {(course.promoVideoCloudflareId || course.promoVideo || course.thumbnail) && (
        <section
          style={{
            background: '#1a202c',
            borderBottom: '1px solid #e2e8f0',
            padding: '40px 0',
          }}
        >
          <div
            className="container"
            style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}
          >
            {/* Video Player */}
            {course.promoVideoCloudflareId ? (
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
                <iframe
                  src={`https://customer-iq7mgkvtb3bwxqf5.cloudflarestream.com/${course.promoVideoCloudflareId}/iframe?preload=true&poster=https%3A%2F%2Fcustomer-iq7mgkvtb3bwxqf5.cloudflarestream.com%2F${course.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D0s%26height%3D600`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    borderRadius: '12px',
                    border: 'none',
                  }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  title={`${course.title} - Promo Video`}
                />
              </div>
            ) : course.promoVideo ? (
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%' }}>
                {/* YouTube/Vimeo embed */}
                {course.promoVideo.includes('youtube.com') ||
                course.promoVideo.includes('youtu.be') ? (
                  <iframe
                    src={course.promoVideo
                      .replace('watch?v=', 'embed/')
                      .replace('youtu.be/', 'youtube.com/embed/')}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${course.title} - Promo Video`}
                  />
                ) : course.promoVideo.includes('vimeo.com') ? (
                  <iframe
                    src={course.promoVideo.replace('vimeo.com/', 'player.vimeo.com/video/')}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      border: 'none',
                    }}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={`${course.title} - Promo Video`}
                  />
                ) : (
                  <video
                    src={course.promoVideo}
                    controls
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      objectFit: 'contain',
                      background: '#000',
                    }}
                  />
                )}
              </div>
            ) : course.thumbnail ? (
              <div
                style={{
                  height: '500px',
                  backgroundImage: `url(${course.thumbnail})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '12px',
                  position: 'relative',
                }}
              >
                {/* Play button overlay for thumbnail */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'rgba(118, 75, 162, 0.9)',
                    borderRadius: '50%',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg
                    style={{ width: '40px', height: '40px', fill: '#fff', marginLeft: '4px' }}
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                </div>
              </div>
            ) : null}

            {/* Video Label */}
            {(course.promoVideoCloudflareId || course.promoVideo) && (
              <div
                style={{
                  marginTop: '16px',
                  textAlign: 'center',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                🎥 Course Preview
              </div>
            )}
          </div>
        </section>
      )}

      {/* Description Section - Right after video */}
      <section
        style={{
          background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          padding: '40px 0',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}
        >
          <p
            style={{
              fontSize: '20px',
              color: '#4a5568',
              lineHeight: '1.8',
              textAlign: 'center',
              maxWidth: '900px',
              margin: '0 auto',
            }}
          >
            {course.description}
          </p>
        </div>
      </section>

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

            {/* Lessons List */}
            {lessons.length > 0 && (
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
                  Course Lessons ({lessons.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {lessons.map((lesson, idx) => (
                    <div
                      key={lesson.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: lesson.cloudflareVideoId ? '200px 1fr' : '1fr',
                          gap: '20px',
                        }}
                      >
                        {/* Video Thumbnail */}
                        {lesson.cloudflareVideoId && (
                          <div style={{ position: 'relative' }}>
                            <img
                              src={`https://customer-iq7mgkvtb3bwxqf5.cloudflarestream.com/${lesson.cloudflareVideoId}/thumbnails/thumbnail.jpg?time=0s&height=300`}
                              alt={lesson.title}
                              style={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '12px 0 0 12px',
                              }}
                            />
                            {/* Play button overlay */}
                            <div
                              style={{
                                position: 'absolute',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                background: 'rgba(0,0,0,0.6)',
                                borderRadius: '50%',
                                width: '48px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg
                                style={{ width: '24px', height: '24px', fill: '#fff' }}
                                viewBox="0 0 20 20"
                              >
                                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                              </svg>
                            </div>
                          </div>
                        )}

                        {/* Lesson Info */}
                        <div style={{ padding: '20px' }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'start',
                              justifyContent: 'space-between',
                              marginBottom: '12px',
                            }}
                          >
                            <div style={{ flex: 1 }}>
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '12px',
                                  marginBottom: '8px',
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: '14px',
                                    color: '#666',
                                    fontWeight: '600',
                                  }}
                                >
                                  Lesson {idx + 1}
                                </span>
                                {lesson.isFree && (
                                  <span
                                    style={{
                                      padding: '4px 8px',
                                      background: '#48bb78',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: '600',
                                    }}
                                  >
                                    FREE PREVIEW
                                  </span>
                                )}
                              </div>
                              <h3
                                style={{
                                  fontSize: '18px',
                                  fontWeight: '600',
                                  marginBottom: '8px',
                                  color: '#2d3748',
                                }}
                              >
                                {lesson.title}
                              </h3>
                              {lesson.description && (
                                <p
                                  style={{
                                    fontSize: '14px',
                                    color: '#4a5568',
                                    lineHeight: '1.6',
                                    marginBottom: '12px',
                                  }}
                                >
                                  {lesson.description}
                                </p>
                              )}
                            </div>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '14px',
                                color: '#666',
                                marginLeft: '16px',
                              }}
                            >
                              <span>⏱️</span>
                              <span>{lesson.duration}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Curriculum - Show only if no lessons loaded from API */}
            {!lessons.length && course.curriculum && course.curriculum.length > 0 && (
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
