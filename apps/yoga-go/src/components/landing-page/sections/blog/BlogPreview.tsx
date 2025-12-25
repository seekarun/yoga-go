'use client';

import { useState, useEffect } from 'react';
import type { SectionPreviewProps } from '../types';
import type { BlogPost } from '@/types';

export default function BlogPreview({
  data,
  expertId,
  expertName,
  template = 'classic',
}: SectionPreviewProps) {
  const blog = data.blog;
  const [latestPost, setLatestPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  const isModern = template === 'modern';

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

  // Theme-based styles
  const styles = {
    section: {
      padding: '40px 20px',
      background: isModern ? '#111' : '#fff',
    },
    title: {
      fontSize: '20px',
      fontWeight: '700' as const,
      marginBottom: '8px',
      color: isModern ? '#fff' : '#111',
    },
    description: {
      fontSize: '14px',
      marginBottom: '24px',
      color: isModern ? 'rgba(255,255,255,0.6)' : '#666',
    },
    emptyText: {
      color: isModern ? 'rgba(255,255,255,0.5)' : '#9ca3af',
      fontSize: '14px',
    },
    card: {
      background: isModern ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
      borderRadius: '12px',
      overflow: 'hidden' as const,
      textAlign: 'left' as const,
      boxShadow: isModern ? 'none' : '0 2px 8px rgba(0,0,0,0.08)',
      border: isModern ? '1px solid rgba(255,255,255,0.1)' : 'none',
    },
    cardTitle: {
      fontSize: '16px',
      fontWeight: '600' as const,
      marginBottom: '8px',
      color: isModern ? '#fff' : '#111',
      lineHeight: '1.3',
    },
    cardExcerpt: {
      fontSize: '13px',
      color: isModern ? 'rgba(255,255,255,0.6)' : '#666',
      marginBottom: '12px',
      lineHeight: '1.5',
      display: '-webkit-box' as const,
      WebkitLineClamp: 2,
      WebkitBoxOrient: 'vertical' as const,
      overflow: 'hidden' as const,
    },
    readTime: {
      fontSize: '12px',
      color: isModern ? 'rgba(255,255,255,0.4)' : '#999',
    },
    readMore: {
      fontSize: '13px',
      color: 'var(--brand-600)',
      fontWeight: '500' as const,
    },
    loadingBg: {
      background: isModern ? 'rgba(255,255,255,0.03)' : '#f8f8f8',
      borderRadius: '8px',
      padding: '40px',
      border: isModern ? '1px solid rgba(255,255,255,0.1)' : 'none',
    },
    loadingText: {
      color: isModern ? 'rgba(255,255,255,0.5)' : '#9ca3af',
      fontSize: '14px',
    },
    viewAllLink: {
      fontSize: '14px',
      color: 'var(--brand-600)',
      fontWeight: '500' as const,
    },
  };

  // Show placeholder if no posts
  if (!loading && !latestPost) {
    return (
      <section style={{ ...styles.section, textAlign: 'center' }}>
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.emptyText}>No blog posts yet. Create your first post to show it here.</p>
      </section>
    );
  }

  return (
    <section style={styles.section}>
      <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        {/* Section Header */}
        <h2 style={styles.title}>{title}</h2>
        <p style={styles.description}>{description}</p>

        {/* Latest Post Card */}
        {loading ? (
          <div style={styles.loadingBg}>
            <p style={styles.loadingText}>Loading latest post...</p>
          </div>
        ) : latestPost ? (
          <div style={styles.card}>
            {/* Cover Image */}
            {latestPost.coverImage && (
              <div
                style={{
                  width: '100%',
                  height: '160px',
                  overflow: 'hidden',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <h3 style={styles.cardTitle}>{latestPost.title}</h3>
              <p style={styles.cardExcerpt}>{latestPost.excerpt}</p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={styles.readTime}>{latestPost.readTimeMinutes} min read</span>
                <span style={styles.readMore}>Read more →</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* View All Link */}
        {latestPost && (
          <div style={{ marginTop: '16px' }}>
            <span style={styles.viewAllLink}>View all posts →</span>
          </div>
        )}
      </div>
    </section>
  );
}
