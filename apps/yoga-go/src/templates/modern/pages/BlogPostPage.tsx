'use client';

import Link from 'next/link';
import type { BlogPostPageProps } from '../../types';
import { BlogPostContent, BlogLikeButton, BlogCommentList } from '@/components/blog';

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

export default function BlogPostPage({ post, expert }: BlogPostPageProps) {
  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      {/* Article Content */}
      <article
        className="container"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '40px 20px 80px',
        }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '24px',
            padding: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '24px' }}>
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
              <span style={{ fontSize: '18px' }}>&#8592;</span>
              Back to posts
            </Link>
          </div>

          {/* Author Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
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
                {formatRelativeTime(post.publishedAt || post.createdAt || '')}
              </div>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              marginBottom: '24px',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '17px',
              lineHeight: '1.8',
            }}
          >
            <BlogPostContent content={post.content} media={post.media} />
          </div>

          {/* Like button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <BlogLikeButton postId={post.id} initialLikeCount={post.likeCount} />
          </div>

          {/* Comments */}
          <div
            style={{
              borderTop: '1px solid rgba(255,255,255,0.08)',
              paddingTop: '24px',
            }}
          >
            <BlogCommentList postId={post.id} expertId={expert.id} />
          </div>
        </div>
      </article>
    </div>
  );
}
