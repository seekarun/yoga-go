'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, BlogPostStatus, BlogPostAttachment, Expert } from '@/types';
import { BlogPostEditor } from '@/components/blog';
import NotificationOverlay from '@/components/NotificationOverlay';

export default function NewBlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [authChecking, setAuthChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [heroImage, setHeroImage] = useState<string | undefined>(undefined);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error';
  } | null>(null);

  // Check authorization and fetch hero image
  useEffect(() => {
    checkAuthorization();
    fetchHeroImage();
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

  // Fetch expert's hero image from landing page config
  const fetchHeroImage = async () => {
    try {
      const response = await fetch(`/data/experts/${expertId}`);
      const data = await response.json();

      if (data.success && data.data) {
        const expert: Expert = data.data;
        // Try published landing page first, then draft
        const heroImg =
          expert.customLandingPage?.hero?.heroImage || expert.draftLandingPage?.hero?.heroImage;
        if (heroImg) {
          console.log('[DBG][new-blog-post] Using hero image as default cover:', heroImg);
          setHeroImage(heroImg);
        }
      }
    } catch (err) {
      console.log('[DBG][new-blog-post] Could not fetch hero image:', err);
    }
  };

  const handleSave = async (post: {
    title: string;
    content: string;
    coverImage?: string;
    status: BlogPostStatus;
    tags: string[];
    attachments: BlogPostAttachment[];
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
        setNotification({ message: data.error || 'Failed to create post', type: 'error' });
      }
    } catch (err) {
      console.error('[DBG][new-blog-post] Error:', err);
      setNotification({ message: 'Failed to create post', type: 'error' });
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
          <BlogPostEditor
            expertId={expertId}
            defaultCoverImage={heroImage}
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
