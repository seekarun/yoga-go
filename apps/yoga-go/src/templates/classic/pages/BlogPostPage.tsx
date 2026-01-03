'use client';

import Link from 'next/link';
import type { BlogPostPageProps } from '../../types';
import { BlogPostContent, BlogLikeButton } from '@/components/blog';
import { ForumContainer } from '@/components/forum';

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
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Article Content */}
      <article
        className="container"
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          padding: '40px 20px',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          {/* Breadcrumb */}
          <div style={{ marginBottom: '20px' }}>
            <Link href="/blog" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>
              Back to posts
            </Link>
          </div>

          {/* Author Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            {expert.profilePic ? (
              <img
                src={expert.profilePic}
                alt={expert.name}
                style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{
                  width: '48px',
                  height: '48px',
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
              <div style={{ fontSize: '14px', color: '#666' }}>
                {formatRelativeTime(post.publishedAt || post.createdAt || '')}
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ marginBottom: '24px' }}>
            <BlogPostContent content={post.content} media={post.media} />
          </div>

          {/* Like button */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
            <BlogLikeButton postId={post.id} initialLikeCount={post.likeCount} />
          </div>

          {/* Comments */}
          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            <ForumContainer
              context={`blog.post.${post.id}`}
              contextType="blog"
              contextVisibility="public"
              expertId={expert.id}
              sourceTitle={post.content.substring(0, 50)}
              sourceUrl={`/blog/${post.id}`}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
