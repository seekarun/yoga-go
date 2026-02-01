'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Post, Expert } from '@/types';
import PostCard from '@/components/PostCard';
import NotificationOverlay from '@/components/NotificationOverlay';

export default function ExpertPostsDashboard() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [posts, setPosts] = useState<Post[]>([]);
  const [expert, setExpert] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<Post | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch expert data and posts in parallel
      const [expertRes, postsRes] = await Promise.all([
        fetch(`/data/experts/${expertId}`, { credentials: 'include' }),
        fetch('/data/app/expert/me/blog', { credentials: 'include' }),
      ]);

      const expertData = await expertRes.json();
      const postsData = await postsRes.json();

      if (expertData.success && expertData.data) {
        setExpert(expertData.data);
      }

      if (postsData.success) {
        setPosts(postsData.data || []);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      console.error('[DBG][posts-dashboard] Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      console.log('[DBG][posts-dashboard] Fetching posts for expert:', expertId);

      const response = await fetch('/data/app/expert/me/blog', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setPosts(data.data || []);
        console.log('[DBG][posts-dashboard] Posts loaded:', data.data?.length || 0);
      } else {
        setError('Failed to load posts');
      }
    } catch (err) {
      console.error('[DBG][posts-dashboard] Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (postId: string) => {
    router.push(`/srv/${expertId}/blog/${postId}/edit`);
  };

  const handleDeleteClick = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      setPostToDelete(post);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    const postId = postToDelete.id;

    try {
      const response = await fetch(`/data/app/expert/me/blog/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setPosts(posts.filter(p => p.id !== postId));
        setNotification({ message: 'Post deleted', type: 'success' });
      } else {
        setNotification({ message: data.error || 'Failed to delete post', type: 'error' });
      }
    } catch (err) {
      console.error('[DBG][posts-dashboard] Error deleting post:', err);
      setNotification({ message: 'Failed to delete post', type: 'error' });
    } finally {
      setPostToDelete(null);
    }
  };

  return (
    <>
      {/* Header matching DashboardHeader style */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
              <p className="text-sm text-gray-500 mt-1">Share updates with your audience</p>
            </div>
            <Link
              href={`/srv/${expertId}/blog/new`}
              className="px-4 py-2 text-white text-sm rounded-lg transition-colors font-medium inline-flex items-center"
              style={{ background: 'var(--color-primary)' }}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              New Post
            </Link>
          </div>
        </div>
      </div>

      <div className="px-6 lg:px-8 py-6">
        {loading ? (
          <div className="text-center py-16">
            <div className="text-gray-500">Loading posts...</div>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-white rounded-xl">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchPosts}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Try Again
            </button>
          </div>
        ) : posts.length > 0 ? (
          <div className="grid gap-6 max-w-2xl mx-auto">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                expertName={expert?.name}
                expertAvatar={expert?.profilePic}
                showStatus
                isOwner
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 bg-white rounded-xl">
            <span className="text-5xl mb-4 block">📝</span>
            <h2 className="text-2xl font-semibold mb-4">No posts yet</h2>
            <p className="text-gray-600 mb-6">Start sharing with your audience.</p>
            <Link
              href={`/srv/${expertId}/blog/new`}
              className="px-6 py-3 text-white rounded-lg font-medium inline-block"
              style={{ background: 'var(--color-primary)' }}
            >
              Create Your First Post
            </Link>
          </div>
        )}
      </div>

      {/* Delete Confirmation Overlay */}
      <NotificationOverlay
        isOpen={!!postToDelete}
        onClose={() => setPostToDelete(null)}
        message="Are you sure you want to delete this post? This action cannot be undone."
        type="error"
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Notification */}
      <NotificationOverlay
        isOpen={!!notification}
        onClose={() => setNotification(null)}
        message={notification?.message || ''}
        type={notification?.type || 'error'}
        duration={4000}
      />
    </>
  );
}
