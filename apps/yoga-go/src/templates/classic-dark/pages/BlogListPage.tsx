'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { BlogListPageProps } from '../../types';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function BlogListPage({ posts, expert }: BlogListPageProps) {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#0a0a0a' }}>
      {/* Header */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 20px' }}
        >
          <Link
            href="/"
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
              display: 'inline-block',
            }}
          >
            Back to {expert.name}
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#fff' }}>Posts</h1>
        </div>
      </div>

      {/* Posts Feed */}
      <section style={{ padding: '24px 20px' }}>
        <div className="container" style={{ maxWidth: '600px', margin: '0 auto' }}>
          {posts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {posts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.id}`}
                  style={{
                    display: 'block',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    border: '1px solid rgba(255,255,255,0.08)',
                    textDecoration: 'none',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '16px',
                    }}
                  >
                    {expert.avatar ? (
                      <img
                        src={expert.avatar}
                        alt={expert.name}
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid rgba(255,255,255,0.1)',
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--brand-500)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          color: 'var(--brand-500-contrast)',
                        }}
                      >
                        {expert.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '600', color: '#fff', fontSize: '14px' }}>
                        {expert.name}
                      </div>
                      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                        {formatRelativeTime(post.publishedAt || post.createdAt || '')}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <div
                      style={{
                        padding: '0 16px 12px',
                        color: 'rgba(255,255,255,0.85)',
                        fontSize: '15px',
                        lineHeight: '1.5',
                        whiteSpace: 'pre-wrap',
                        display: '-webkit-box',
                        WebkitLineClamp: 4,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {post.content}
                    </div>
                  )}

                  {/* First Media Preview */}
                  {post.media && post.media.length > 0 && (
                    <div style={{ position: 'relative' }}>
                      {post.media[0].type === 'image' ? (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                          <Image
                            src={post.media[0].url}
                            alt="Post media"
                            fill
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      ) : (
                        <video
                          src={post.media[0].url}
                          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover' }}
                        />
                      )}
                      {post.media.length > 1 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.7)',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '12px',
                          }}
                        >
                          +{post.media.length - 1}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      gap: '16px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                      {post.likeCount} likes
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                      {post.commentCount} comments
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 24px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff' }}>No posts yet</h2>
              <p style={{ color: 'rgba(255,255,255,0.6)' }}>Check back later for new posts.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
