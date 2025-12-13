'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, BlogPostStatus, BlogPostAttachment } from '@/types';
import { BlogPostEditor } from '@/components/blog';

export default function NewBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [authChecking, setAuthChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Check authorization
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][new-blog-post] Checking authorization');

      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success || !data.data) {
        router.push('/');
        return;
      }

      const user: User = data.data;
      const isExpert = Array.isArray(user.role)
        ? user.role.includes('expert')
        : user.role === 'expert';

      if (!isExpert || !user.expertProfile || user.expertProfile !== expertId) {
        router.push('/');
        return;
      }

      setAuthChecking(false);
    } catch (err) {
      console.error('[DBG][new-blog-post] Error:', err);
      router.push('/');
    }
  };

  const handleSave = async (post: {
    title: string;
    content: string;
    coverImage?: string;
    status: BlogPostStatus;
    tags: string[];
    attachments: BlogPostAttachment[];
    excerpt?: string;
  }) => {
    setIsSaving(true);
    try {
      console.log('[DBG][new-blog-post] Creating post:', post.title);

      const response = await fetch('/data/app/expert/me/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(post),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DBG][new-blog-post] Post created:', data.data.id);
        router.push(`/srv/${expertId}/blog`);
      } else {
        alert(data.error || 'Failed to create post');
      }
    } catch (err) {
      console.error('[DBG][new-blog-post] Error:', err);
      alert('Failed to create post');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/srv/${expertId}/blog`);
  };

  if (authChecking) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div
          className="container"
          style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
        >
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
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
          style={{ maxWidth: '800px', margin: '0 auto', padding: '24px 20px' }}
        >
          <Link
            href={`/srv/${expertId}/blog`}
            style={{
              color: '#666',
              fontSize: '14px',
              textDecoration: 'none',
              marginBottom: '8px',
              display: 'inline-block',
            }}
          >
            ← Back to Blog Management
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>New Blog Post</h1>
        </div>
      </div>

      {/* Editor */}
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
      >
        <div style={{ background: '#fff', borderRadius: '12px', padding: '32px' }}>
          <BlogPostEditor onSave={handleSave} onCancel={handleCancel} isSaving={isSaving} />
        </div>
      </div>
    </div>
  );
}
