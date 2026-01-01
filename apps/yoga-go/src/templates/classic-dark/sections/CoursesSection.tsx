import Link from 'next/link';
import { SECTION_MAX_WIDTH } from '../../shared';
import type { CoursesSectionProps } from '../../types';

export default function CoursesSection({ courses }: CoursesSectionProps) {
  if (courses.length === 0) return null;

  const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

  return (
    <div>
      <section
        id="courses"
        style={{
          padding: '80px 20px',
          background: '#1a1a1a',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <div className="container" style={{ maxWidth: SECTION_MAX_WIDTH, margin: '0 auto' }}>
          <h2
            className="courses-section-title"
            style={{
              fontSize: '48px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '60px',
              color: 'var(--brand-400, #fff)',
            }}
          >
            Courses
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '80px' }}>
            {courses.map(course => (
              <div
                key={course.id}
                className="course-item"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '48px',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                  }}
                >
                  {course.promoVideoCloudflareId && course.promoVideoStatus === 'ready' ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                      <iframe
                        src={`https://customer-${cfSubdomain}.cloudflarestream.com/${course.promoVideoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${cfSubdomain}.cloudflarestream.com%2F${course.promoVideoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                        style={{
                          border: 'none',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          height: '100%',
                          width: '100%',
                        }}
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                        allowFullScreen={true}
                      />
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={course.thumbnail || course.coverImage}
                      alt={course.title}
                      style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                  )}
                </div>

                <div>
                  <h3
                    className="course-title"
                    style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      marginBottom: '16px',
                      color: '#ffffff',
                      lineHeight: '1.2',
                    }}
                  >
                    {course.title}
                  </h3>

                  <p
                    className="course-description"
                    style={{
                      fontSize: '18px',
                      lineHeight: '1.8',
                      color: '#a0a0a0',
                      marginBottom: '24px',
                    }}
                  >
                    {course.description}
                  </p>

                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginBottom: '32px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--brand-400, #9ca3af)',
                        }}
                      >
                        Level:
                      </span>
                      <span style={{ fontSize: '14px', color: '#a0a0a0' }}>{course.level}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--brand-400, #9ca3af)',
                        }}
                      >
                        Duration:
                      </span>
                      <span style={{ fontSize: '14px', color: '#a0a0a0' }}>{course.duration}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--brand-400, #9ca3af)',
                        }}
                      >
                        Lessons:
                      </span>
                      <span style={{ fontSize: '14px', color: '#a0a0a0' }}>
                        {course.totalLessons}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--brand-400, #9ca3af)',
                        }}
                      >
                        Category:
                      </span>
                      <span style={{ fontSize: '14px', color: '#a0a0a0' }}>{course.category}</span>
                    </div>
                  </div>

                  <Link
                    href={`/courses/${course.id}`}
                    className="course-details-button"
                    style={{
                      display: 'inline-block',
                      padding: '14px 32px',
                      background:
                        'linear-gradient(135deg, var(--brand-400, #9ca3af) 0%, var(--brand-500, #6b7280) 100%)',
                      color: 'var(--brand-500-contrast, #fff)',
                      fontSize: '16px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.2)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    More Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
