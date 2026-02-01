import Link from 'next/link';
import type { CourseListPageProps } from '../../types';

const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

export default function CourseListPage({ courses, expert }: CourseListPageProps) {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Hero Section */}
      <section
        style={{
          padding: '80px 40px',
          background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
          position: 'relative',
        }}
      >
        {/* Decorative gradient */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '50%',
            height: '100%',
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-500) 10%, transparent) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
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
            <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>Courses</span>
          </div>

          <h1
            style={{
              fontSize: '52px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            All Courses
          </h1>
          <p
            style={{
              fontSize: '20px',
              color: 'rgba(255,255,255,0.6)',
              maxWidth: '600px',
              lineHeight: '1.6',
            }}
          >
            Explore all courses by {expert.name}
          </p>
        </div>
      </section>

      {/* Courses List */}
      <section style={{ padding: '60px 40px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {courses.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 20px',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <p style={{ fontSize: '18px' }}>No courses available yet.</p>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              {courses.map((course, index) => (
                <div
                  key={course.id}
                  className="course-item"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: index % 2 === 0 ? '1.2fr 1fr' : '1fr 1.2fr',
                    gap: '48px',
                    alignItems: 'center',
                    background: 'rgba(255,255,255,0.02)',
                    borderRadius: '24px',
                    padding: '32px',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Video/Image */}
                  <div
                    style={{
                      borderRadius: '16px',
                      overflow: 'hidden',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                      order: index % 2 === 0 ? 0 : 1,
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
                  <div style={{ order: index % 2 === 0 ? 1 : 0 }}>
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
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: '600',
                            textTransform: 'uppercase',
                          }}
                        >
                          New
                        </span>
                      )}
                      <span
                        style={{
                          padding: '6px 12px',
                          background: 'var(--brand-100)',
                          color: 'var(--brand-700)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                        }}
                      >
                        {course.level}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '28px',
                        fontWeight: '700',
                        marginBottom: '16px',
                        color: '#fff',
                        lineHeight: '1.2',
                      }}
                    >
                      {course.title}
                    </h3>

                    <p
                      style={{
                        fontSize: '16px',
                        lineHeight: '1.7',
                        color: 'rgba(255,255,255,0.6)',
                        marginBottom: '24px',
                      }}
                    >
                      {course.description}
                    </p>

                    {/* Stats Row */}
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '20px',
                        marginBottom: '28px',
                        paddingBottom: '24px',
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>⏱</span>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                          {course.duration}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>📚</span>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                          {course.totalLessons} lessons
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#FFB800', fontSize: '16px' }}>★</span>
                        <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
                          {course.rating}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/courses/${course.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '16px 32px',
                        background:
                          'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                        color: 'var(--brand-500-contrast)',
                        fontSize: '15px',
                        fontWeight: '600',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        boxShadow:
                          '0 8px 24px color-mix(in srgb, var(--brand-500) 30%, transparent)',
                      }}
                    >
                      View Course
                      <span style={{ fontSize: '18px' }}>→</span>
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
          .course-item > div {
            order: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
