'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { User, PostMedia, PostStatus } from '@/types';
import PostComposer from '@/components/PostComposer';
import NotificationOverlay from '@/components/NotificationOverlay';

export default function NewPostPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [authChecking, setAuthChecking] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'error';
  } | null>(null);

  // Check authorization
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][new-post] Checking authorization');

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
      console.error('[DBG][new-post] Error:', err);
      router.push('/');
    }
  };

  const handleSave = async (data: { content: string; media: PostMedia[]; status: PostStatus }) => {
    setIsSaving(true);
    try {
      console.log('[DBG][new-post] Creating post');

      const response = await fetch('/data/app/expert/me/blog', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        console.log('[DBG][new-post] Post created:', result.data.id);
        router.push(`/srv/${expertId}/blog`);
      } else {
        setNotification({ message: result.error || 'Failed to create post', type: 'error' });
      }
    } catch (err) {
      console.error('[DBG][new-post] Error:', err);
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
      <div className="min-h-screen bg-gray-50 pt-16">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <Link
            href={`/srv/${expertId}/blog`}
            className="text-gray-500 text-sm hover:text-gray-700 mb-2 inline-block"
          >
            ← Back to Posts
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">New Post</h1>
        </div>
      </div>

      {/* Editor */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <PostComposer
          expertId={expertId}
          onSave={handleSave}
          onCancel={handleCancel}
          isSaving={isSaving}
        />
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
