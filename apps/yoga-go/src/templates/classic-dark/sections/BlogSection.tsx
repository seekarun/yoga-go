import Link from 'next/link';
import { SECTION_MAX_WIDTH } from '../../shared';
import type { BlogSectionProps } from '../../types';

export default function BlogSection({ title, description, latestPost }: BlogSectionProps) {
  return (
    <div style={{ background: '#0f0f0f' }}>
      <section
        style={{
          padding: '80px 20px',
          background: '#1a1a1a',
          textAlign: 'center',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: '600',
              marginBottom: '12px',
              color: 'var(--brand-400, #fff)',
            }}
          >
            {title || 'From the Blog'}
          </h2>
          <p
            style={{ fontSize: '18px', marginBottom: '24px', color: '#a0a0a0', lineHeight: '1.6' }}
          >
            {description || 'Insights, tips, and articles from our expert'}
          </p>
          {latestPost && (
            <div
              style={{
                background: '#1f1f1f',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                marginBottom: '24px',
                textAlign: 'left',
                border: '1px solid #333',
              }}
            >
              {latestPost.coverImage && (
                <div
                  style={{
                    width: '100%',
                    height: '200px',
                    background: `url(${latestPost.coverImage}) center/cover`,
                  }}
                />
              )}
              <div style={{ padding: '20px' }}>
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: '#fff',
                    marginBottom: '8px',
                  }}
                >
                  {latestPost.title}
                </h3>
                <p
                  style={{
                    fontSize: '14px',
                    color: '#a0a0a0',
                    lineHeight: '1.5',
                    marginBottom: '12px',
                  }}
                >
                  {latestPost.excerpt}
                </p>
                <Link
                  href={`/blog/${latestPost.id}`}
                  style={{
                    fontSize: '14px',
                    color: 'var(--brand-400, #60a5fa)',
                    fontWeight: '500',
                  }}
                >
                  Read more →
                </Link>
              </div>
            </div>
          )}
          <Link
            href="/blog"
            style={{
              padding: '14px 32px',
              background: 'var(--brand-500)',
              color: 'var(--brand-500-contrast, #fff)',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'transform 0.2s, opacity 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.opacity = '1';
            }}
          >
            View All Posts
          </Link>
        </div>
      </section>
    </div>
  );
}
