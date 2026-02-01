'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { BlogPost, User } from '@/types';
import { BlogPostContent, BlogLikeButton } from '@/components/blog';
import { ForumContainer } from '@/components/forum';

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function ExpertBlogPostViewPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const postId = params.postId as string;
  const highlightThreadId = searchParams.get('highlightThread') || undefined;

  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecking, setAuthChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  // Check authorization
  useEffect(() => {
    const checkAuthorization = async () => {
      try {
        console.log('[DBG][blog-post-view] Checking authorization');

        const response = await fetch('/api/auth/me');
        const data = await response.json();

        if (!data.success || !data.data) {
          router.push('/');
          return;
        }

        const userData: User = data.data;
        const isExpert = Array.isArray(userData.role)
          ? userData.role.includes('expert')
          : userData.role === 'expert';

        if (!isExpert || !userData.expertProfile || userData.expertProfile !== expertId) {
          router.push('/');
          return;
        }

        setUser(userData);
        setAuthChecking(false);
      } catch (err) {
        console.error('[DBG][blog-post-view] Error:', err);
        router.push('/');
      }
    };

    checkAuthorization();
  }, [expertId, router]);

  // Fetch post after auth check
  useEffect(() => {
    if (authChecking) return;

    const fetchPost = async () => {
      try {
        console.log('[DBG][blog-post-view] Fetching blog post:', postId);
        const res = await fetch(`/data/app/expert/me/blog/${postId}`);
        const data = await res.json();

        if (data.success) {
          setPost(data.data);
          console.log('[DBG][blog-post-view] Post loaded:', data.data.title || 'Untitled');
        } else {
          setError(data.error || 'Failed to load post');
        }
      } catch (err) {
        console.error('[DBG][blog-post-view] Error fetching post:', err);
        setError('Failed to load post');
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [authChecking, postId]);

  if (authChecking || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="text-center text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-10">
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <h2 className="text-xl font-semibold text-red-600 mb-4">{error || 'Post not found'}</h2>
            <Link
              href={`/srv/${expertId}/blog`}
              className="text-sm hover:underline"
              style={{ color: 'var(--color-primary)' }}
            >
              Back to Posts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <article className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          {/* Breadcrumb with Edit link */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href={`/srv/${expertId}/blog`}
              className="text-gray-500 text-sm hover:text-gray-700"
            >
              ← Back to Posts
            </Link>
            <Link
              href={`/srv/${expertId}/blog/${postId}/edit`}
              className="text-sm font-medium px-4 py-1.5 rounded-lg hover:opacity-90"
              style={{
                background: 'var(--color-primary)',
                color: 'white',
              }}
            >
              Edit Post
            </Link>
          </div>

          {/* Author Header */}
          <div className="flex items-center gap-3 mb-6">
            {user?.profile?.avatar ? (
              <img
                src={user.profile.avatar}
                alt={user.profile.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-white"
                style={{ background: 'var(--color-primary)' }}
              >
                {user?.profile?.name?.charAt(0) || 'E'}
              </div>
            )}
            <div>
              <div className="font-semibold text-gray-900">{user?.profile?.name || 'Expert'}</div>
              <div className="text-sm text-gray-500">
                {formatRelativeTime(post.publishedAt || post.createdAt || '')}
                {post.status === 'draft' && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                    Draft
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="mb-6">
            <BlogPostContent content={post.content} media={post.media} />
          </div>

          {/* Like button */}
          <div className="flex justify-center mb-6">
            <BlogLikeButton postId={post.id} initialLikeCount={post.likeCount} />
          </div>

          {/* Comments */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>
            <ForumContainer
              context={`blog.post.${post.id}`}
              contextType="blog"
              contextVisibility="public"
              expertId={expertId}
              sourceTitle={post.content.substring(0, 50)}
              sourceUrl={`/blog/${post.id}`}
              highlightThreadId={highlightThreadId}
            />
          </div>
        </div>
      </article>
    </div>
  );
}
