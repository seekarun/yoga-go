import Link from 'next/link';
import type { CourseDetailPageProps } from '../../types';
import type { Lesson } from '@/types';

const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

export default function CourseDetailPage({
  course,
  lessons,
  expert,
  isEnrolled,
  onEnrollClick,
}: CourseDetailPageProps) {
  const formatPrice = () => {
    if (course.price === 0) return 'Free';
    const symbol = course.currency === 'INR' ? '₹' : '$';
    return `${symbol}${course.price.toLocaleString()}`;
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Hero Banner */}
      <section
        style={{
          position: 'relative',
          minHeight: '500px',
          background: course.coverImage
            ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.9)), url(${course.coverImage})`
            : 'linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Decorative gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '50%',
            height: '100%',
            background:
              'radial-gradient(ellipse at left, color-mix(in srgb, var(--brand-500) 15%, transparent) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '60px 40px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px' }}>
            <Link
              href="/"
              style={{
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              {expert.name}
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 12px' }}>/</span>
            <Link
              href="/courses"
              style={{
                color: 'rgba(255,255,255,0.6)',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              Courses
            </Link>
            <span style={{ color: 'rgba(255,255,255,0.4)', margin: '0 12px' }}>/</span>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{course.title}</span>
          </div>

          {/* Badges */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            {course.isNew && (
              <span
                style={{
                  padding: '6px 14px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: '#fff',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                }}
              >
                New
              </span>
            )}
            <span
              style={{
                padding: '6px 14px',
                background: 'var(--brand-100)',
                color: 'var(--brand-700)',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '600',
                textTransform: 'uppercase',
              }}
            >
              {course.level}
            </span>
            <span
              style={{
                padding: '6px 14px',
                background: 'rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.8)',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              {course.category}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '52px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '20px',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              maxWidth: '800px',
            }}
          >
            {course.title}
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.7)',
              marginBottom: '32px',
              lineHeight: '1.6',
              maxWidth: '700px',
            }}
          >
            {course.description}
          </p>

          {/* Instructor */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundImage: `url(${expert.avatar || '/images/default-avatar.jpg'})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                border: '3px solid var(--brand-500)',
              }}
            />
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: '#fff' }}>
                {expert.name}
              </div>
              <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                {expert.title || 'Expert'}
              </div>
            </div>
          </div>

          {/* Stats & CTA */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '40px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', gap: '32px' }}>
              {/* Only show rating if there are actual ratings */}
              {course.totalRatings && course.totalRatings > 0 && (
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#FFB800',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>★</span>
                    <span style={{ fontSize: '18px', fontWeight: '700' }}>{course.rating}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {course.totalRatings} ratings
                  </div>
                </div>
              )}
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                  {course.totalStudents?.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>students</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                  {course.totalLessons}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>lessons</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
                  {course.duration}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>duration</div>
              </div>
            </div>

            <button
              onClick={onEnrollClick}
              style={{
                padding: '18px 40px',
                background: isEnrolled
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                color: 'var(--brand-500-contrast)',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 32px color-mix(in srgb, var(--brand-500) 40%, transparent)',
              }}
            >
              {isEnrolled ? 'Continue Learning' : `Enroll Now - ${formatPrice()}`}
            </button>
          </div>
        </div>
      </section>

      {/* Promo Video */}
      {(course.promoVideoCloudflareId || course.promoVideo) && (
        <section
          style={{
            background: '#111',
            padding: '60px 40px',
          }}
        >
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div
              style={{
                position: 'relative',
                paddingBottom: '56.25%',
                borderRadius: '16px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
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
                  title={`${course.title} - Promo`}
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
                  title={`${course.title} - Promo`}
                />
              ) : null}
            </div>
            <p
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                marginTop: '16px',
              }}
            >
              Course Preview
            </p>
          </div>
        </section>
      )}

      {/* Course Content */}
      <section style={{ padding: '80px 40px' }}>
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            gap: '60px',
          }}
        >
          {/* Main Content */}
          <div>
            {/* Lessons */}
            {lessons.length > 0 && (
              <div>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '32px',
                  }}
                >
                  Course Lessons ({lessons.length})
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {lessons.map((lesson: Lesson, idx: number) => (
                    <div
                      key={lesson.id}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'grid',
                        gridTemplateColumns: lesson.cloudflareVideoId ? '180px 1fr' : '1fr',
                        gap: '20px',
                      }}
                    >
                      {/* Thumbnail */}
                      {lesson.cloudflareVideoId && (
                        <div style={{ position: 'relative' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={`https://customer-${cfSubdomain}.cloudflarestream.com/${lesson.cloudflareVideoId}/thumbnails/thumbnail.jpg?time=0s&height=200`}
                            alt={lesson.title}
                            style={{
                              width: '100%',
                              height: '120px',
                              objectFit: 'cover',
                            }}
                          />
                          <div
                            style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              background: 'rgba(0,0,0,0.7)',
                              borderRadius: '50%',
                              width: '40px',
                              height: '40px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <span style={{ color: '#fff', fontSize: '16px' }}>▶</span>
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div
                        style={{ padding: lesson.cloudflareVideoId ? '16px 16px 16px 0' : '20px' }}
                      >
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
                              fontSize: '12px',
                              color: 'rgba(255,255,255,0.5)',
                              fontWeight: '600',
                            }}
                          >
                            LESSON {idx + 1}
                          </span>
                          {lesson.isFree && (
                            <span
                              style={{
                                padding: '3px 8px',
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                color: '#fff',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: '700',
                              }}
                            >
                              FREE
                            </span>
                          )}
                        </div>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#fff',
                            marginBottom: '6px',
                          }}
                        >
                          {lesson.title}
                        </h3>
                        {lesson.description && (
                          <p
                            style={{
                              fontSize: '14px',
                              color: 'rgba(255,255,255,0.5)',
                              lineHeight: '1.5',
                            }}
                          >
                            {lesson.description}
                          </p>
                        )}
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.4)',
                            marginTop: '8px',
                          }}
                        >
                          {lesson.duration}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Curriculum fallback */}
            {lessons.length === 0 && course.curriculum && course.curriculum.length > 0 && (
              <div>
                <h2
                  style={{
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '32px',
                  }}
                >
                  Course Curriculum
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {course.curriculum.map((week, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          padding: '16px 20px',
                          background: 'rgba(255,255,255,0.02)',
                          borderBottom: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{ fontWeight: '600', color: '#fff' }}>
                          Week {week.week}: {week.title}
                        </div>
                        <div
                          style={{
                            fontSize: '13px',
                            color: 'rgba(255,255,255,0.5)',
                            marginTop: '4px',
                          }}
                        >
                          {week.lessons?.length || 0} lessons
                        </div>
                      </div>
                      {week.lessons?.map((lesson: Lesson, lessonIdx: number) => (
                        <div
                          key={lessonIdx}
                          style={{
                            padding: '14px 20px',
                            borderBottom:
                              lessonIdx < (week.lessons?.length || 0) - 1
                                ? '1px solid rgba(255,255,255,0.05)'
                                : 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '16px', color: 'rgba(255,255,255,0.4)' }}>
                              {lesson.isFree ? '▶' : '🔒'}
                            </span>
                            <div>
                              <div style={{ color: '#fff', fontSize: '14px' }}>{lesson.title}</div>
                              {lesson.isFree && (
                                <span
                                  style={{
                                    fontSize: '11px',
                                    color: '#10b981',
                                    fontWeight: '600',
                                  }}
                                >
                                  FREE PREVIEW
                                </span>
                              )}
                            </div>
                          </div>
                          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                            {lesson.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            {/* Tags */}
            {course.tags && course.tags.length > 0 && (
              <div
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '16px',
                  padding: '24px',
                }}
              >
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#fff',
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
                        padding: '8px 14px',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .course-detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
