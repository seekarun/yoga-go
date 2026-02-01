'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { SectionEditorProps } from '../types';
import type { Post } from '@/types';

export default function BlogEditor({ data, onChange, expertId }: SectionEditorProps) {
  const blog = data.blog || {};
  const [latestPost, setLatestPost] = useState<Post | null>(null);
  const [postCount, setPostCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBlogPosts = async () => {
      try {
        const response = await fetch(`/data/experts/${expertId}/blog`);
        const result = await response.json();

        if (result.success && result.data) {
          setPostCount(result.data.length);
          if (result.data.length > 0) {
            setLatestPost(result.data[0]);
          }
        }
      } catch (err) {
        console.error('[DBG][BlogEditor] Error fetching blog posts:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogPosts();
  }, [expertId]);

  const handleChange = (field: 'title' | 'description', value: string) => {
    onChange({
      blog: {
        ...blog,
        [field]: value,
      },
    });
  };

  // Truncate content for preview
  const getPostPreview = (post: Post): string => {
    const text = post.content || '';
    if (text.length <= 40) return text;
    return text.substring(0, 40) + '...';
  };

  return (
    <div className="space-y-6">
      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm text-blue-800">
              This section automatically displays your latest post. Create posts from the Posts
              page.
            </p>
          </div>
        </div>
      </div>

      {/* Blog Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Posts Status</h4>
        {loading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Published Posts</span>
              <span className="text-sm font-medium text-gray-900">{postCount}</span>
            </div>
            {latestPost && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Latest Post</span>
                <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                  {getPostPreview(latestPost)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Manage Blog Link */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Link
            href={`/srv/${expertId}/blog`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Manage Posts
          </Link>
        </div>
      </div>

      {/* Section Customization */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-gray-700">Section Settings</h4>

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Section Title</label>
          <input
            type="text"
            value={blog.title || ''}
            onChange={e => handleChange('title', e.target.value)}
            placeholder="Latest Posts"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Description</label>
          <input
            type="text"
            value={blog.description || ''}
            onChange={e => handleChange('description', e.target.value)}
            placeholder="Updates and insights from our expert"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* No Posts Warning */}
      {!loading && postCount === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div>
              <p className="text-sm text-amber-800 font-medium">No posts yet</p>
              <p className="text-sm text-amber-700 mt-1">
                Create your first post to show this section on your landing page.
              </p>
              <Link
                href={`/srv/${expertId}/blog/new`}
                className="inline-flex items-center gap-1 mt-2 text-sm text-amber-800 hover:text-amber-900 font-medium underline"
              >
                Create your first post
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
