'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useExpert } from '@/contexts/ExpertContext';
import { BlogPostPage as ModernBlogPostPage } from '@/templates/modern/pages';
import { BlogPostPage as ClassicBlogPostPage } from '@/templates/classic/pages';
import type { BlogPost } from '@/types';

export default function ExpertBlogPostPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const postId = params.postId as string;
  const highlightThreadId = searchParams.get('highlightThread') || undefined;
  const { expert, expertId, template, loading: expertLoading, error: expertError } = useExpert();

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPost = async () => {
      if (!expertId) return;

      try {
        console.log('[DBG][blog-post-page] Fetching blog post:', postId);
        const res = await fetch(`/data/experts/${expertId}/blog/${postId}`);
        const data = await res.json();

        if (data.success) {
          setPost(data.data);
          console.log('[DBG][blog-post-page] Post loaded:', data.data.title);
        }
      } catch (error) {
        console.error('[DBG][blog-post-page] Error fetching post:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [expertId, postId]);

  // Show loading while expert or post is loading
  if (expertLoading || loading) {
    return null; // Layout shows loading state
  }

  // Expert or post not found
  if (expertError || !expert || !post) {
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
          <h2 style={{ fontSize: '24px', marginBottom: '16px' }}>
            {!post ? 'Post not found' : 'Expert not found'}
          </h2>
          <Link href="/blog" style={{ color: 'var(--brand-500)', textDecoration: 'underline' }}>
            Back to blog
          </Link>
        </div>
      </div>
    );
  }

  // Select the appropriate template component
  const BlogPostPage = template === 'modern' ? ModernBlogPostPage : ClassicBlogPostPage;

  return <BlogPostPage post={post} expert={expert} highlightThreadId={highlightThreadId} />;
}
