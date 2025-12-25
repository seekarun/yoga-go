'use client';

import Link from 'next/link';
import type { BlogListPageProps } from '../../types';

export default function BlogListPage({ posts, expert }: BlogListPageProps) {
  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '60px 20px' }}
        >
          <Link
            href="/"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s',
            }}
          >
            <span style={{ fontSize: '18px' }}>←</span>
            Back to {expert.name}
          </Link>
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            Blog
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
            Insights and articles from {expert.name}
          </p>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <section style={{ padding: '60px 20px' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {posts.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '32px',
              }}
            >
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  style={{
                    display: 'block',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '20px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textDecoration: 'none',
                    transition: 'transform 0.3s, border-color 0.3s',
                  }}
                >
                  {post.coverImage && (
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        background: `url(${post.coverImage}) center/cover`,
                        position: 'relative',
                      }}
                    >
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
                  <div style={{ padding: '24px' }}>
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginBottom: '12px',
                        }}
                      >
                        {post.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: '4px 10px',
                              background: 'var(--brand-500)',
                              color: 'var(--brand-500-contrast)',
                              borderRadius: '6px',
                              fontSize: '11px',
                              fontWeight: '600',
                              textTransform: 'uppercase',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3
                      style={{
                        fontSize: '20px',
                        fontWeight: '700',
                        color: '#fff',
                        marginBottom: '8px',
                        lineHeight: '1.3',
                      }}
                    >
                      {post.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: '1.6',
                        marginBottom: '16px',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {post.excerpt}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                        {post.readTimeMinutes} min read
                      </span>
                      <span
                        style={{
                          color: 'var(--brand-400)',
                          fontSize: '14px',
                          fontWeight: '600',
                        }}
                      >
                        Read more →
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '80px 40px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <span style={{ fontSize: '64px', marginBottom: '24px', display: 'block' }}>📝</span>
              <h2
                style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: '#fff',
                  marginBottom: '12px',
                }}
              >
                No blog posts yet
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px' }}>
                Check back later for new articles and insights.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
