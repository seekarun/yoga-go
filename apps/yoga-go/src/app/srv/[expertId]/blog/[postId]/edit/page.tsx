'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, BlogPost, BlogPostStatus, BlogPostAttachment } from '@/types';
import { BlogPostEditor } from '@/components/blog';
import NotificationOverlay from '@/components/NotificationOverlay';

export default function EditBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const postId = params.postId as string;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error';
  } | null>(null);

  // Check authorization
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  // Fetch post after auth check
  useEffect(() => {
    if (!authChecking) {
      fetchPost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecking, postId]);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][edit-blog-post] Checking authorization');

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
      console.error('[DBG][edit-blog-post] Error:', err);
      router.push('/');
    }
  };

  const fetchPost = async () => {
    try {
      console.log('[DBG][edit-blog-post] Fetching post:', postId);

      const response = await fetch(`/data/app/expert/me/blog/${postId}`, {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setPost(data.data);
        console.log('[DBG][edit-blog-post] Post loaded:', data.data.title);
      } else {
        setError(data.error || 'Failed to load post');
      }
    } catch (err) {
      console.error('[DBG][edit-blog-post] Error:', err);
      setError('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (postData: {
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
      console.log('[DBG][edit-blog-post] Updating post:', postId);

      const response = await fetch(`/data/app/expert/me/blog/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(postData),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DBG][edit-blog-post] Post updated');
        router.push(`/srv/${expertId}/blog`);
      } else {
        setNotification({ message: data.error || 'Failed to update post', type: 'error' });
      }
    } catch (err) {
      console.error('[DBG][edit-blog-post] Error:', err);
      setNotification({ message: 'Failed to update post', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/srv/${expertId}/blog`);
  };

  if (authChecking || loading) {
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

  if (error || !post) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div
          className="container"
          style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
        >
          <div
            style={{
              textAlign: 'center',
              padding: '60px',
              background: '#fff',
              borderRadius: '16px',
            }}
          >
            <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#dc2626' }}>
              {error || 'Post not found'}
            </h2>
            <Link href={`/srv/${expertId}/blog`} style={{ color: '#2563eb' }}>
              ← Back to Blog Management
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
          <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>Edit Blog Post</h1>
        </div>
      </div>

      {/* Editor */}
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
      >
        <div style={{ background: '#fff', borderRadius: '12px', padding: '32px' }}>
          <BlogPostEditor
            initialPost={post}
            onSave={handleSave}
            onCancel={handleCancel}
            isSaving={isSaving}
          />
        </div>
      </div>

      {/* Notification Overlay */}
      <NotificationOverlay
        isOpen={notification !== null}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type="error"
        duration={4000}
      />
    </div>
  );
}
