import Link from 'next/link';
import type { CourseDetailPageProps } from '../../types';
import type { Lesson } from '@/types';
import { formatPrice } from '@/lib/currency/currencyService';

const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

export default function CourseDetailPage({
  course,
  lessons,
  expert,
  isEnrolled,
  onEnrollClick,
}: CourseDetailPageProps) {
  const displayPrice = () => {
    if (course.price === 0) return 'Free';
    return formatPrice(course.price, course.currency || 'USD');
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Hero Banner */}
      {course.coverImage && (
        <section
          style={{
            height: '400px',
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.4), rgba(0, 0, 0, 0.4)), url(${course.coverImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ textAlign: 'center', color: '#fff', maxWidth: '800px', padding: '0 20px' }}>
            <h1
              style={{
                fontSize: '56px',
                fontWeight: '700',
                marginBottom: '16px',
                textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                lineHeight: '1.2',
              }}
            >
              {course.title}
            </h1>
            <p
              style={{
                fontSize: '20px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
              }}
            >
              {course.description}
            </p>
          </div>
        </section>
      )}

      {/* Course Info Section */}
      <section style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px', fontSize: '14px', color: '#666' }}>
            <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'none' }}>
              {expert.name}
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <Link href="/courses" style={{ color: 'var(--brand-500)', textDecoration: 'none' }}>
              Courses
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>{course.title}</span>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
            {course.isNew && (
              <span
                style={{
                  padding: '6px 12px',
                  background: '#10b981',
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
                  background: 'var(--brand-500)',
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
                color: 'var(--brand-600)',
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
              color: '#1a202c',
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
                backgroundImage: `url(${expert.avatar || '/images/default-avatar.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a202c' }}>
                {expert.name}
              </div>
              <div style={{ fontSize: '14px', color: '#666' }}>{expert.title || 'Expert'}</div>
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
            {/* Only show rating if there are actual ratings */}
            {course.totalRatings && course.totalRatings > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#FFB800', fontSize: '20px' }}>★</span>
                <span style={{ fontSize: '16px', fontWeight: '600' }}>{course.rating}</span>
                <span style={{ fontSize: '14px', color: '#666' }}>
                  ({course.totalRatings} ratings)
                </span>
              </div>
            )}
            <div style={{ fontSize: '16px', color: '#666' }}>
              {course.totalStudents?.toLocaleString()} students
            </div>
            <div style={{ fontSize: '16px', color: '#666' }}>{course.totalLessons} lessons</div>
            <div style={{ fontSize: '16px', color: '#666' }}>{course.duration}</div>
            <button
              onClick={onEnrollClick}
              className="enroll-button"
              style={{
                padding: '14px 32px',
                background: isEnrolled ? '#10b981' : 'var(--brand-500)',
                color: 'var(--brand-500-contrast, #fff)',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                marginLeft: 'auto',
                transition: 'transform 0.2s, background 0.2s',
              }}
            >
              {isEnrolled ? 'Start Learning' : `Enroll Now - ${displayPrice()}`}
            </button>
          </div>
        </div>
      </section>

      {/* Promo Video Section */}
      {(course.promoVideoCloudflareId || course.promoVideo) && (
        <section
          style={{
            background: '#1a202c',
            borderBottom: '1px solid #e2e8f0',
            padding: '40px 0',
          }}
        >
          <div
            className="container"
            style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 20px' }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '56.25%',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {course.promoVideoCloudflareId ? (
                <iframe
                  src={`https://customer-${cfSubdomain}.cloudflarestream.com/${course.promoVideoCloudflareId}/iframe?preload=true`}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                  }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                  allowFullScreen
                  title={`${course.title} - Promo Video`}
                />
              ) : course.promoVideo?.includes('youtube') ||
                course.promoVideo?.includes('youtu.be') ? (
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
                    border: 'none',
                  }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={`${course.title} - Promo Video`}
                />
              ) : null}
            </div>
            <div
              style={{
                marginTop: '16px',
                textAlign: 'center',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              Course Preview
            </div>
          </div>
        </section>
      )}

      {/* Description Section */}
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

      {/* Course Content */}
      <div
        className="container"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
      >
        <div
          className="course-content-grid"
          style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '40px' }}
        >
          {/* Main Content */}
          <div>
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
                    color: '#1a202c',
                  }}
                >
                  Course Lessons ({lessons.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {lessons.map((lesson: Lesson, idx: number) => (
                    <div
                      key={lesson.id}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        overflow: 'hidden',
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
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`https://customer-${cfSubdomain}.cloudflarestream.com/${lesson.cloudflareVideoId}/thumbnails/thumbnail.jpg?time=0s&height=300`}
                              alt={lesson.title}
                              style={{
                                width: '100%',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '12px 0 0 12px',
                              }}
                            />
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
                              <span style={{ color: '#fff', fontSize: '20px' }}>▶</span>
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
                                      background: '#10b981',
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

            {/* Curriculum fallback */}
            {lessons.length === 0 && course.curriculum && course.curriculum.length > 0 && (
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
                    color: '#1a202c',
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
                        <div style={{ fontWeight: '600', fontSize: '16px', color: '#1a202c' }}>
                          Week {week.week}: {week.title}
                        </div>
                        <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                          {week.lessons?.length || 0} lessons
                        </div>
                      </div>
                      {week.lessons?.map((lesson: Lesson, lessonIdx: number) => (
                        <div
                          key={lessonIdx}
                          style={{
                            padding: '16px 20px',
                            borderBottom:
                              lessonIdx < (week.lessons?.length || 0) - 1
                                ? '1px solid #e2e8f0'
                                : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '20px' }}>{lesson.isFree ? '▶' : '🔒'}</span>
                            <div>
                              <div
                                style={{ fontSize: '15px', fontWeight: '500', color: '#2d3748' }}
                              >
                                {lesson.title}
                              </div>
                              {lesson.isFree && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    color: '#10b981',
                                    fontWeight: '600',
                                  }}
                                >
                                  FREE PREVIEW
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', color: '#666' }}>{lesson.duration}</div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sidebar */}
          <div>
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
                    color: '#1a202c',
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
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .course-content-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
