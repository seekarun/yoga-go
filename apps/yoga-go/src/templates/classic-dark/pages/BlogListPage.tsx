'use client';

import Link from 'next/link';
import type { BlogListPageProps } from '../../types';

export default function BlogListPage({ posts, expert }: BlogListPageProps) {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}
        >
          <Link
            href="/"
            style={{
              color: '#666',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '16px',
              display: 'inline-block',
            }}
          >
            ← Back to {expert.name}
          </Link>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
            Blog
          </h1>
          <p style={{ fontSize: '18px', color: '#666' }}>
            Insights and articles from {expert.name}
          </p>
        </div>
      </div>

      {/* Blog Posts Grid */}
      <section style={{ padding: '40px 20px' }}>
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
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    textDecoration: 'none',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  {post.coverImage && (
                    <div
                      style={{
                        width: '100%',
                        height: '200px',
                        background: `url(${post.coverImage}) center/cover`,
                      }}
                    />
                  )}
                  <div style={{ padding: '20px' }}>
                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '6px',
                          marginBottom: '12px',
                        }}
                      >
                        {post.tags.slice(0, 2).map(tag => (
                          <span
                            key={tag}
                            style={{
                              padding: '4px 8px',
                              background: '#f3f4f6',
                              color: '#4b5563',
                              borderRadius: '4px',
                              fontSize: '12px',
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    <h3
                      style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        color: '#111',
                        marginBottom: '8px',
                        lineHeight: '1.4',
                      }}
                    >
                      {post.title}
                    </h3>
                    <p
                      style={{
                        fontSize: '14px',
                        color: '#666',
                        lineHeight: '1.5',
                        marginBottom: '12px',
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
                      <span style={{ fontSize: '13px', color: '#999' }}>
                        {post.readTimeMinutes} min read
                      </span>
                      <span style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500' }}>
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
                padding: '60px',
                background: '#fff',
                borderRadius: '16px',
              }}
            >
              <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>📝</span>
              <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>No blog posts yet</h2>
              <p style={{ color: '#666' }}>Check back later for new articles and insights.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
