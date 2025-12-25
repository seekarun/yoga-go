'use client';

import Link from 'next/link';
import type { BlogPostPageProps } from '../../types';
import { BlogPostContent, BlogLikeButton, BlogCommentList } from '@/components/blog';

export default function BlogPostPage({ post, expert }: BlogPostPageProps) {
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      {/* Cover Image */}
      {post.coverImage && (
        <div style={{ width: '100%', height: '450px', position: 'relative' }}>
          <img
            src={post.coverImage}
            alt={post.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(to top, #0a0a0a 0%, transparent 50%)',
            }}
          />
        </div>
      )}

      {/* Article Content */}
      <article
        className="container"
        style={{
          maxWidth: '800px',
          margin: '0 auto',
          padding: '40px 20px 80px',
          marginTop: post.coverImage ? '-120px' : '0',
          position: 'relative',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '24px',
            padding: '48px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '32px' }}>
            <Link
              href="/blog"
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: '14px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span style={{ fontSize: '18px' }}>←</span>
              Back to blog
            </Link>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '40px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '24px',
              lineHeight: '1.2',
              letterSpacing: '-0.02em',
            }}
          >
            {post.title}
          </h1>

          {/* Meta */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              marginBottom: '32px',
              flexWrap: 'wrap',
            }}
          >
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {expert.avatar ? (
                <img
                  src={expert.avatar}
                  alt={expert.name}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid rgba(255,255,255,0.1)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    background: 'var(--brand-500)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: 'var(--brand-500-contrast)',
                    fontSize: '18px',
                  }}
                >
                  {expert.name.charAt(0)}
                </div>
              )}
              <div>
                <div style={{ fontWeight: '600', color: '#fff' }}>{expert.name}</div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
                  {formattedDate}
                </div>
              </div>
            </div>

            {/* Separator */}
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>•</span>

            {/* Read time */}
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
              {post.readTimeMinutes} min read
            </span>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '40px' }}>
              {post.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: '6px 14px',
                    background: 'rgba(255,255,255,0.08)',
                    borderRadius: '20px',
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div
            style={{
              marginBottom: '40px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '17px',
              lineHeight: '1.8',
            }}
          >
            <BlogPostContent content={post.content} />
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div
              style={{
                marginBottom: '40px',
                padding: '24px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  marginBottom: '16px',
                  color: '#fff',
                }}
              >
                Attachments
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {post.attachments.map(attachment => (
                  <a
                    key={attachment.id}
                    href={`/data/app/blog/attachments/${attachment.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '10px',
                      textDecoration: 'none',
                      color: '#fff',
                      border: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.2s',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>📎</span>
                    <span style={{ flex: 1 }}>{attachment.filename}</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  </a>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '12px' }}>
                * Sign in to download attachments
              </p>
            </div>
          )}

          {/* Like button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '40px' }}>
            <BlogLikeButton postId={post.id} initialLikeCount={post.likeCount} />
          </div>

          {/* Comments */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '40px',
            }}
          >
            <BlogCommentList postId={post.id} expertId={expert.id} />
          </div>
        </div>
      </article>
    </div>
  );
}
