'use client';

import { useState, useEffect } from 'react';
import type { SectionPreviewProps } from '../types';
import type { BlogPost } from '@/types';

export default function BlogPreview({ data, expertId, expertName }: SectionPreviewProps) {
  const blog = data.blog;
  const [latestPost, setLatestPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestPost = async () => {
      if (!expertId) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/data/experts/${expertId}/blog`);
        const result = await response.json();

        if (result.success && result.data && result.data.length > 0) {
          setLatestPost(result.data[0]); // First post is the latest
        }
      } catch (err) {
        console.error('[DBG][BlogPreview] Error fetching blog posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLatestPost();
  }, [expertId]);

  const title = blog?.title || 'From the Blog';
  const description =
    blog?.description || `Insights, tips, and articles from ${expertName || 'our expert'}`;

  // Show placeholder if no posts
  if (!loading && !latestPost) {
    return (
      <section
        style={{
          padding: '40px 20px',
          background: '#fff',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#111',
          }}
        >
          {title}
        </h2>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No blog posts yet. Create your first post to show it here.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '40px 20px',
        background: '#fff',
      }}
    >
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        {/* Section Header */}
        <h2
          style={{
            fontSize: '20px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#111',
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontSize: '14px',
            marginBottom: '24px',
            color: '#666',
          }}
        >
          {description}
        </p>

        {/* Latest Post Card */}
        {loading ? (
          <div
            style={{
              background: '#f8f8f8',
              borderRadius: '8px',
              padding: '40px',
            }}
          >
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>Loading latest post...</p>
          </div>
        ) : latestPost ? (
          <div
            style={{
              background: '#f8f8f8',
              borderRadius: '12px',
              overflow: 'hidden',
              textAlign: 'left',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {/* Cover Image */}
            {latestPost.coverImage && (
              <div
                style={{
                  width: '100%',
                  height: '160px',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={latestPost.coverImage}
                  alt={latestPost.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            )}

            {/* Post Content */}
            <div style={{ padding: '16px' }}>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px',
                  color: '#111',
                  lineHeight: '1.3',
                }}
              >
                {latestPost.title}
              </h3>
              <p
                style={{
                  fontSize: '13px',
                  color: '#666',
                  marginBottom: '12px',
                  lineHeight: '1.5',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {latestPost.excerpt}
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: '12px', color: '#999' }}>
                  {latestPost.readTimeMinutes} min read
                </span>
                <span
                  style={{
                    fontSize: '13px',
                    color: 'var(--brand-600)',
                    fontWeight: '500',
                  }}
                >
                  Read more →
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* View All Link */}
        {latestPost && (
          <div style={{ marginTop: '16px' }}>
            <span
              style={{
                fontSize: '14px',
                color: 'var(--brand-600)',
                fontWeight: '500',
              }}
            >
              View all posts →
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
