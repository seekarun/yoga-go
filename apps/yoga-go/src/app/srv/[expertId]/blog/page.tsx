'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { BlogPost } from '@/types';
import NotificationOverlay from '@/components/NotificationOverlay';

export default function ExpertBlogDashboard() {
  const params = useParams();
  const expertId = params.expertId as string;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<BlogPost | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'error';
  } | null>(null);

  useEffect(() => {
    fetchBlogPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const fetchBlogPosts = async () => {
    try {
      setLoading(true);
      console.log('[DBG][blog-dashboard] Fetching blog posts for expert:', expertId);

      const response = await fetch('/data/app/expert/me/blog', {
        credentials: 'include',
      });
      const data = await response.json();

      if (data.success) {
        setPosts(data.data || []);
        console.log('[DBG][blog-dashboard] Blog posts loaded:', data.data?.length || 0);
      } else {
        setError('Failed to load blog posts');
      }
    } catch (err) {
      console.error('[DBG][blog-dashboard] Error fetching blog posts:', err);
      setError('Failed to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (post: BlogPost) => {
    setPostToDelete(post);
  };

  const handleDeleteConfirm = async () => {
    if (!postToDelete) return;
    const postId = postToDelete.id;

    setDeletingPostId(postId);
    try {
      const response = await fetch(`/data/app/expert/me/blog/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (data.success) {
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        setNotification({ message: data.error || 'Failed to delete post', type: 'error' });
      }
    } catch (err) {
      console.error('[DBG][blog-dashboard] Error deleting post:', err);
      setNotification({ message: 'Failed to delete post', type: 'error' });
    } finally {
      setDeletingPostId(null);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-white shadow">
        <div className="px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Blog</h1>
              <p className="text-sm text-gray-500 mt-1">Manage your blog posts</p>
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

      {/* Content */}
      <div className="px-6 lg:px-8 py-8">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Loading blog posts...</div>
          </div>
        ) : error ? (
          <div
            style={{
              textAlign: 'center',
              padding: '60px',
              background: '#fff',
              borderRadius: '16px',
            }}
          >
            <p style={{ color: '#dc2626', marginBottom: '16px' }}>{error}</p>
            <button
              onClick={fetchBlogPosts}
              style={{
                padding: '8px 16px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Try Again
            </button>
          </div>
        ) : posts.length > 0 ? (
          <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px',
                      fontWeight: '600',
                      color: '#374151',
                    }}
                  >
                    Title
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px',
                      fontWeight: '600',
                      color: '#374151',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      textAlign: 'left',
                      padding: '16px',
                      fontWeight: '600',
                      color: '#374151',
                    }}
                  >
                    Date
                  </th>
                  <th
                    style={{
                      textAlign: 'center',
                      padding: '16px',
                      fontWeight: '600',
                      color: '#374151',
                    }}
                  >
                    Stats
                  </th>
                  <th
                    style={{
                      textAlign: 'right',
                      padding: '16px',
                      fontWeight: '600',
                      color: '#374151',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: '500', color: '#111', marginBottom: '4px' }}>
                        {post.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {post.excerpt?.substring(0, 60)}...
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span
                        style={{
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '12px',
                          fontWeight: '500',
                          background: post.status === 'published' ? '#dcfce7' : '#fef3c7',
                          color: post.status === 'published' ? '#166534' : '#92400e',
                        }}
                      >
                        {post.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', color: '#666', fontSize: '14px' }}>
                      {post.publishedAt
                        ? new Date(post.publishedAt).toLocaleDateString()
                        : new Date(post.createdAt || '').toLocaleDateString()}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{ marginRight: '12px' }}>❤️ {post.likeCount}</span>
                      <span>💬 {post.commentCount}</span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/experts/${expertId}/blog/${post.id}`}
                          target="_blank"
                          style={{
                            padding: '6px 12px',
                            background: '#f3f4f6',
                            color: '#374151',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '14px',
                          }}
                        >
                          View
                        </Link>
                        <Link
                          href={`/srv/${expertId}/blog/${post.id}/edit`}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--color-primary)',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '14px',
                          }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteClick(post)}
                          disabled={deletingPostId === post.id}
                          style={{
                            padding: '6px 12px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: deletingPostId === post.id ? 'not-allowed' : 'pointer',
                            fontSize: '14px',
                            opacity: deletingPostId === post.id ? 0.5 : 1,
                          }}
                        >
                          {deletingPostId === post.id ? '...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <p style={{ color: '#666', marginBottom: '24px' }}>
              Start sharing your knowledge with your audience.
            </p>
            <Link
              href={`/srv/${expertId}/blog/new`}
              style={{
                padding: '12px 24px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                display: 'inline-block',
              }}
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
        message={`Are you sure you want to delete "${postToDelete?.title}"? This action cannot be undone.`}
        type="error"
        onConfirm={handleDeleteConfirm}
        confirmText="Delete"
        cancelText="Cancel"
      />

      {/* Error Notification */}
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
