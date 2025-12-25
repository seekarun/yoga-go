import Link from 'next/link';
import type { BlogSectionProps } from '../../types';

export default function BlogSection({ title, description, latestPost }: BlogSectionProps) {
  return (
    <section style={{ padding: '80px 20px', background: '#f8f9fa', textAlign: 'center' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '12px', color: '#111' }}>
          {title || 'From the Blog'}
        </h2>
        <p style={{ fontSize: '18px', marginBottom: '24px', color: '#666', lineHeight: '1.6' }}>
          {description || 'Insights, tips, and articles from our expert'}
        </p>
        {latestPost && (
          <div
            style={{
              background: '#fff',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              marginBottom: '24px',
              textAlign: 'left',
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
                  color: '#111',
                  marginBottom: '8px',
                }}
              >
                {latestPost.title}
              </h3>
              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  lineHeight: '1.5',
                  marginBottom: '12px',
                }}
              >
                {latestPost.excerpt}
              </p>
              <Link
                href={`/blog/${latestPost.id}`}
                style={{ fontSize: '14px', color: '#2563eb', fontWeight: '500' }}
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
            background: '#111',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'transform 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.background = '#333';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.background = '#111';
          }}
        >
          View All Posts
        </Link>
      </div>
    </section>
  );
}
