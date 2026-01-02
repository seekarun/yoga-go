'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { BlogListPageProps } from '../../types';

const CF_SUBDOMAIN = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'iq7mgkvtb3bwxqf5';

// Check if URL is a Cloudflare video ID (32 char hex)
const isCloudflareVideoId = (url: string) => /^[a-f0-9]{32}$/.test(url);

// Get Cloudflare iframe URL from video ID
const getCloudflareVideoUrl = (videoId: string) =>
  `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;

// Get Cloudflare thumbnail URL from video ID
const getCloudflareThumbnailUrl = (videoId: string) =>
  `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=1s&height=400`;

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
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div
          className="container"
          style={{ maxWidth: '600px', margin: '0 auto', padding: '32px 20px' }}
        >
          <Link
            href="/"
            style={{
              color: '#666',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '12px',
              display: 'inline-block',
            }}
          >
            Back to {expert.name}
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>Posts</h1>
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
                    background: '#fff',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
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
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                        }}
                      >
                        {expert.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div style={{ fontWeight: '600', color: '#111', fontSize: '14px' }}>
                        {expert.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        {formatRelativeTime(post.publishedAt || post.createdAt || '')}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  {post.content && (
                    <div
                      style={{
                        padding: '0 16px 12px',
                        color: '#333',
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
                      ) : post.media[0].type === 'video' ? (
                        <div style={{ position: 'relative', width: '100%', aspectRatio: '1' }}>
                          {/* Show video thumbnail with play icon overlay */}
                          {isCloudflareVideoId(post.media[0].url) ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={getCloudflareThumbnailUrl(post.media[0].url)}
                                alt="Video thumbnail"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              {/* Play icon overlay */}
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  width: '60px',
                                  height: '60px',
                                  background: 'rgba(0,0,0,0.6)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="white"
                                  style={{ marginLeft: '3px' }}
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </>
                          ) : post.media[0].thumbnailUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={post.media[0].thumbnailUrl}
                                alt="Video thumbnail"
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  width: '60px',
                                  height: '60px',
                                  background: 'rgba(0,0,0,0.6)',
                                  borderRadius: '50%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <svg
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="white"
                                  style={{ marginLeft: '3px' }}
                                >
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </div>
                            </>
                          ) : (
                            <div
                              style={{
                                width: '100%',
                                height: '100%',
                                background: '#1a1a1a',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <svg
                                width="48"
                                height="48"
                                viewBox="0 0 24 24"
                                fill="rgba(255,255,255,0.5)"
                              >
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                      ) : null}
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
                      borderTop: '1px solid #eee',
                    }}
                  >
                    <span style={{ color: '#666', fontSize: '13px' }}>{post.likeCount} likes</span>
                    <span style={{ color: '#666', fontSize: '13px' }}>
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
                background: '#fff',
                borderRadius: '12px',
              }}
            >
              <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>No posts yet</h2>
              <p style={{ color: '#666' }}>Check back later for new posts.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
