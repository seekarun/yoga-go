import Link from 'next/link';
import type { CourseListPageProps } from '../../types';

const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

export default function CourseListPage({ courses, expert }: CourseListPageProps) {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Hero Section */}
      <section
        style={{ padding: '60px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0' }}
      >
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
            <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'none' }}>
              {expert.name}
            </Link>
            <span style={{ margin: '0 8px' }}>/</span>
            <span>Courses</span>
          </div>

          <h1
            style={{
              fontSize: '48px',
              fontWeight: '700',
              color: '#1a202c',
              marginBottom: '16px',
            }}
          >
            All Courses
          </h1>
          <p
            style={{
              fontSize: '18px',
              color: '#4a5568',
              maxWidth: '600px',
            }}
          >
            Explore all courses by {expert.name}
          </p>
        </div>
      </section>

      {/* Courses List */}
      <section style={{ padding: '60px 20px' }}>
        <div className="container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
          {courses.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                background: '#fff',
                borderRadius: '12px',
              }}
            >
              <p style={{ fontSize: '18px', color: '#666' }}>No courses available yet.</p>
              <Link
                href="/"
                style={{
                  color: 'var(--brand-500)',
                  textDecoration: 'underline',
                  marginTop: '16px',
                  display: 'inline-block',
                }}
              >
                Back to home
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '60px' }}>
              {courses.map(course => (
                <div
                  key={course.id}
                  className="course-item"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '48px',
                    alignItems: 'center',
                    background: '#fff',
                    borderRadius: '12px',
                    padding: '32px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Video/Image */}
                  <div
                    style={{
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
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
                          allowFullScreen
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

                  {/* Content */}
                  <div>
                    {/* Badges */}
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        marginBottom: '16px',
                        flexWrap: 'wrap',
                      }}
                    >
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
                      <span
                        style={{
                          padding: '6px 12px',
                          background: '#f7fafc',
                          color: 'var(--brand-600)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                        }}
                      >
                        {course.level}
                      </span>
                      <span
                        style={{
                          padding: '6px 12px',
                          background: '#f7fafc',
                          color: '#4a5568',
                          borderRadius: '6px',
                          fontSize: '12px',
                        }}
                      >
                        {course.category}
                      </span>
                    </div>

                    <h3
                      className="course-title"
                      style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        color: '#1a202c',
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
                        color: '#4a5568',
                        marginBottom: '24px',
                      }}
                    >
                      {course.description}
                    </p>

                    {/* Stats */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '24px',
                        marginBottom: '32px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--brand-500)',
                          }}
                        >
                          Level:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>{course.level}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--brand-500)',
                          }}
                        >
                          Duration:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                          {course.duration}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: 'var(--brand-500)',
                          }}
                        >
                          Lessons:
                        </span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>
                          {course.totalLessons}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#FFB800', fontSize: '16px' }}>★</span>
                        <span style={{ fontSize: '14px', color: '#4a5568' }}>{course.rating}</span>
                      </div>
                    </div>

                    <Link
                      href={`/courses/${course.id}`}
                      className="course-details-button"
                      style={{
                        display: 'inline-block',
                        padding: '14px 32px',
                        background:
                          'linear-gradient(135deg, var(--brand-400) 0%, var(--brand-500) 100%)',
                        color: 'var(--brand-500-contrast, #fff)',
                        fontSize: '16px',
                        fontWeight: '600',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                    >
                      View Course
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) {
          .course-item {
            grid-template-columns: 1fr !important;
            gap: 24px !important;
          }
        }
      `}</style>
    </div>
  );
}
