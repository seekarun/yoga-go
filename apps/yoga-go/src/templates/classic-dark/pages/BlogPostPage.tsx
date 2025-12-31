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
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Cover Image */}
      {post.coverImage && (
        <div style={{ width: '100%', height: '400px', position: 'relative' }}>
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
              background: 'linear-gradient(to top, rgba(0,0,0,0.5), transparent)',
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
          padding: '40px 20px',
          marginTop: post.coverImage ? '-100px' : '0',
          position: 'relative',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '40px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px' }}>
            <Link href="/blog" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>
              ← Back to blog
            </Link>
          </div>

          {/* Title */}
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#111',
              marginBottom: '16px',
              lineHeight: '1.2',
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
              marginBottom: '24px',
              flexWrap: 'wrap',
            }}
          >
            {/* Author */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {expert.avatar ? (
                <img
                  src={expert.avatar}
                  alt={expert.name}
                  style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
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
                <div style={{ fontWeight: '600', color: '#111' }}>{expert.name}</div>
                <div style={{ fontSize: '14px', color: '#666' }}>{formattedDate}</div>
              </div>
            </div>

            {/* Separator */}
            <span style={{ color: '#ccc' }}>•</span>

            {/* Read time */}
            <span style={{ fontSize: '14px', color: '#666' }}>{post.readTimeMinutes} min read</span>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '32px' }}>
              {post.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    padding: '4px 12px',
                    background: '#f3f4f6',
                    borderRadius: '16px',
                    fontSize: '14px',
                    color: '#4b5563',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          <div style={{ marginBottom: '32px' }}>
            <BlogPostContent content={post.content} />
          </div>

          {/* Attachments */}
          {post.attachments && post.attachments.length > 0 && (
            <div
              style={{
                marginBottom: '32px',
                padding: '24px',
                background: '#f9fafb',
                borderRadius: '12px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
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
                      gap: '8px',
                      padding: '12px',
                      background: '#fff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: '#111',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <span>📎</span>
                    <span style={{ flex: 1 }}>{attachment.filename}</span>
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      {(attachment.size / 1024).toFixed(1)} KB
                    </span>
                  </a>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                * Sign in to download attachments
              </p>
            </div>
          )}

          {/* Like button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
            <BlogLikeButton postId={post.id} initialLikeCount={post.likeCount} />
          </div>

          {/* Comments */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '32px' }}>
            <BlogCommentList postId={post.id} expertId={expert.id} />
          </div>
        </div>
      </article>
    </div>
  );
}
