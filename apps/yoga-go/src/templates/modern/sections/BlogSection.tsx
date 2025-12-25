import Link from 'next/link';
import type { BlogSectionProps } from '../../types';

export default function BlogSection({
  title,
  description,
  latestPost,
  expertId,
}: BlogSectionProps) {
  return (
    <section
      style={{
        padding: '100px 40px',
        background: 'linear-gradient(180deg, #111 0%, #0a0a0a 100%)',
        position: 'relative',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        {/* Section Header */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50px',
              marginBottom: '16px',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                fontWeight: '600',
                color: 'var(--brand-400)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              Latest Insights
            </span>
          </div>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            {title || 'From the Blog'}
          </h2>
          <p
            style={{
              fontSize: '18px',
              color: 'rgba(255,255,255,0.6)',
              lineHeight: '1.6',
            }}
          >
            {description || 'Insights, tips, and articles from our expert'}
          </p>
        </div>

        {/* Featured Post Card */}
        {latestPost && (
          <Link
            href={`/experts/${expertId}/blog/${latestPost.id}`}
            style={{
              display: 'block',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '24px',
              overflow: 'hidden',
              marginBottom: '32px',
              border: '1px solid rgba(255,255,255,0.08)',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'transform 0.3s, box-shadow 0.3s',
            }}
          >
            {latestPost.coverImage && (
              <div
                style={{
                  width: '100%',
                  height: '280px',
                  background: `url(${latestPost.coverImage}) center/cover`,
                  position: 'relative',
                }}
              >
                {/* Gradient overlay */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '50%',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                  }}
                />
              </div>
            )}

            <div style={{ padding: '32px' }}>
              {/* Category/Tag */}
              <span
                style={{
                  display: 'inline-block',
                  padding: '6px 12px',
                  background: 'var(--brand-100)',
                  color: 'var(--brand-700)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginBottom: '16px',
                  textTransform: 'uppercase',
                }}
              >
                Featured
              </span>

              <h3
                style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '12px',
                  lineHeight: '1.3',
                }}
              >
                {latestPost.title}
              </h3>

              <p
                style={{
                  fontSize: '16px',
                  color: 'rgba(255,255,255,0.6)',
                  lineHeight: '1.7',
                  marginBottom: '20px',
                }}
              >
                {latestPost.excerpt}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--brand-400)',
                  fontSize: '15px',
                  fontWeight: '600',
                }}
              >
                Read article
                <span style={{ fontSize: '18px' }}>→</span>
              </div>
            </div>
          </Link>
        )}

        {/* View All Posts Button */}
        <div style={{ textAlign: 'center' }}>
          <Link
            href={`/experts/${expertId}/blog`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 32px',
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
              color: 'var(--brand-500-contrast)',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              textDecoration: 'none',
              boxShadow: '0 8px 24px color-mix(in srgb, var(--brand-500) 30%, transparent)',
            }}
          >
            View All Posts
            <span style={{ fontSize: '18px' }}>→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
