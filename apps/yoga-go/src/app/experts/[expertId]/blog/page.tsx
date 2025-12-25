'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useExpert } from '@/contexts/ExpertContext';
import { BlogListPage as ModernBlogListPage } from '@/templates/modern/pages';
import { BlogListPage as ClassicBlogListPage } from '@/templates/classic/pages';
import type { BlogPost } from '@/types';

export default function ExpertBlogPage() {
  const { expert, expertId, template, loading: expertLoading, error: expertError } = useExpert();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      if (!expertId) return;

      try {
        console.log('[DBG][blog-page] Fetching blog posts for expert:', expertId);
        const res = await fetch(`/data/experts/${expertId}/blog`);
        const data = await res.json();

        if (data.success) {
          setPosts(data.data || []);
          console.log('[DBG][blog-page] Blog posts loaded:', data.data?.length || 0);
        }
      } catch (error) {
        console.error('[DBG][blog-page] Error fetching posts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [expertId]);

  // Show loading while expert or posts are loading
  if (expertLoading || loading) {
    return null; // Layout shows loading state
  }

  // Expert not found
  if (expertError || !expert) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>Expert not found</h2>
          <Link href="/" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // Select the appropriate template component
  const BlogListPage = template === 'modern' ? ModernBlogListPage : ClassicBlogListPage;

  return <BlogListPage posts={posts} expert={expert} />;
}
