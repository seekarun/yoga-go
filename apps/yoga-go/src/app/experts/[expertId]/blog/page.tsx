'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { BlogPost, Expert } from '@/types';
import { BlogPostCard } from '@/components/blog';

export default function ExpertBlogPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DBG][blog-page] Fetching blog posts for expert:', expertId);

        // Fetch expert info and blog posts in parallel
        const [expertResponse, postsResponse] = await Promise.all([
          fetch(`/data/experts/${expertId}`),
          fetch(`/data/experts/${expertId}/blog`),
        ]);

        const expertData = await expertResponse.json();
        const postsData = await postsResponse.json();

        if (expertData.success) {
          setExpert(expertData.data);
        } else {
          setError('Expert not found');
        }

        if (postsData.success) {
          setPosts(postsData.data || []);
          console.log('[DBG][blog-page] Blog posts loaded:', postsData.data?.length || 0);
        }
      } catch (err) {
        console.error('[DBG][blog-page] Error fetching data:', err);
        setError('Failed to load blog posts');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [expertId]);

  if (loading) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}
        >
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading blog...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '60px',
              background: '#fff',
              borderRadius: '16px',
            }}
          >
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#dc2626' }}>{error}</h2>
            <Link href={`/experts/${expertId}`} style={{ color: '#2563eb' }}>
              ← Back to expert page
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}
        >
          <Link
            href={`/experts/${expertId}`}
            style={{
              color: '#666',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '16px',
              display: 'inline-block',
            }}
          >
            ← Back to {expert?.name || 'expert'}
          </Link>
          <h1 style={{ fontSize: '36px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
            Blog
          </h1>
          <p style={{ fontSize: '18px', color: '#666' }}>
            Insights and articles from {expert?.name || 'our expert'}
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
                <BlogPostCard key={post.id} post={post} expertId={expertId} />
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
