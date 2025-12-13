'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BlogPost, User } from '@/types';

export default function ExpertBlogDashboard() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);

  // Check authorization first
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  useEffect(() => {
    if (!authChecking) {
      fetchBlogPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId, authChecking]);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][blog-dashboard] Checking authorization for expertId:', expertId);

      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success || !data.data) {
        console.log('[DBG][blog-dashboard] Not authenticated, redirecting to login');
        router.push('/');
        return;
      }

      const user: User = data.data;

      const isExpert = Array.isArray(user.role)
        ? user.role.includes('expert')
        : user.role === 'expert';
      if (!isExpert) {
        console.log('[DBG][blog-dashboard] User is not an expert, redirecting to home');
        router.push('/');
        return;
      }

      if (!user.expertProfile) {
        console.log('[DBG][blog-dashboard] Expert profile not set up yet');
        router.push('/srv');
        return;
      }

      if (user.expertProfile !== expertId) {
        console.log("[DBG][blog-dashboard] User doesn't own this profile, redirecting");
        router.push(`/srv/${user.expertProfile}/blog`);
        return;
      }

      console.log('[DBG][blog-dashboard] Authorization check passed');
      setAuthChecking(false);
    } catch (err) {
      console.error('[DBG][blog-dashboard] Error checking authorization:', err);
      router.push('/');
    }
  };

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

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this blog post? This action cannot be undone.')) {
      return;
    }

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
        alert(data.error || 'Failed to delete post');
      }
    } catch (err) {
      console.error('[DBG][blog-dashboard] Error deleting post:', err);
      alert('Failed to delete post');
    } finally {
      setDeletingPostId(null);
    }
  };

  if (authChecking) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div
          className="container"
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}
        >
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '16px', color: '#666' }}>Checking authorization...</div>
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
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px' }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <Link
                href={`/srv/${expertId}`}
                style={{
                  color: '#666',
                  fontSize: '14px',
                  textDecoration: 'none',
                  marginBottom: '8px',
                  display: 'inline-block',
                }}
              >
                ← Back to Dashboard
              </Link>
              <h1 style={{ fontSize: '28px', fontWeight: '700', color: '#111' }}>
                Blog Management
              </h1>
            </div>
            <Link
              href={`/srv/${expertId}/blog/new`}
              style={{
                padding: '12px 24px',
                background: '#2563eb',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '500',
                display: 'inline-block',
              }}
            >
              + New Post
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className="container"
        style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}
      >
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
                            background: '#2563eb',
                            color: '#fff',
                            borderRadius: '6px',
                            textDecoration: 'none',
                            fontSize: '14px',
                          }}
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(post.id)}
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
                background: '#2563eb',
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
    </div>
  );
}
