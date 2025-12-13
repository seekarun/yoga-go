'use client';

import Link from 'next/link';
import type { BlogPost } from '@/types';

interface BlogPostCardProps {
  post: BlogPost;
  expertId: string;
  showStatus?: boolean;
}

export default function BlogPostCard({ post, expertId, showStatus = false }: BlogPostCardProps) {
  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : new Date(post.createdAt || '').toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

  return (
    <Link href={`/experts/${expertId}/blog/${post.id}`}>
      <article className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {/* Cover Image */}
        {post.coverImage ? (
          <div className="aspect-video relative overflow-hidden">
            <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <span className="text-4xl">📝</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5">
          {/* Status badge (for management view) */}
          {showStatus && (
            <div className="mb-2">
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  post.status === 'published'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {post.status === 'published' ? 'Published' : 'Draft'}
              </span>
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>

          {/* Excerpt */}
          <p className="text-gray-600 text-sm mb-4 line-clamp-3">{post.excerpt}</p>

          {/* Meta */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-4">
              <span>{formattedDate}</span>
              <span>{post.readTimeMinutes} min read</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span>❤️</span>
                {post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <span>💬</span>
                {post.commentCount}
              </span>
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                  {tag}
                </span>
              ))}
              {post.tags.length > 3 && (
                <span className="px-2 py-1 text-gray-500 text-xs">
                  +{post.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
