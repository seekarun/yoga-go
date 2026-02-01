'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { Post } from '@/types';

const CF_SUBDOMAIN = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'iq7mgkvtb3bwxqf5';

// Check if URL is a Cloudflare Stream video ID (not a full URL)
const isCloudflareVideoId = (url: string) => {
  return !url.startsWith('http') && url.length === 32;
};

// Construct Cloudflare Stream iframe URL from video ID
const getCloudflareVideoUrl = (videoId: string) => {
  return `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;
};

interface PostCardProps {
  post: Post;
  expertName?: string;
  expertAvatar?: string;
  showStatus?: boolean;
  isOwner?: boolean;
  onEdit?: (postId: string) => void;
  onDelete?: (postId: string) => void;
}

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

export default function PostCard({
  post,
  expertName,
  expertAvatar,
  showStatus = false,
  isOwner = false,
  onEdit,
  onDelete,
}: PostCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  const hasMedia = post.media && post.media.length > 0;
  const hasMultipleMedia = post.media && post.media.length > 1;
  const currentMedia = hasMedia ? post.media![currentMediaIndex] : null;

  const handlePrevMedia = () => {
    setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : (post.media?.length || 1) - 1));
  };

  const handleNextMedia = () => {
    setCurrentMediaIndex(prev => (prev < (post.media?.length || 1) - 1 ? prev + 1 : 0));
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {expertAvatar ? (
            <Image
              src={expertAvatar}
              alt={expertName || 'Expert'}
              width={40}
              height={40}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <span className="text-primary font-medium text-sm">
                {expertName?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>
          )}
          <div>
            <p className="font-medium text-gray-900">{expertName || 'Expert'}</p>
            <p className="text-sm text-gray-500">
              {formatRelativeTime(post.publishedAt || post.createdAt || '')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {showStatus && (
            <span
              className={`text-xs px-2 py-1 rounded ${
                post.status === 'published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {post.status === 'published' ? 'Published' : 'Draft'}
            </span>
          )}

          {isOwner && (onEdit || onDelete) && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
                  />
                </svg>
              </button>

              {showMenu && (
                <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {onEdit && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(post.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(post.id);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Media - shown BEFORE content */}
      {hasMedia && currentMedia && (
        <div className="relative aspect-square bg-gray-500 flex items-center justify-center">
          {currentMedia.type === 'image' ? (
            <Image src={currentMedia.url} alt="Post media" fill className="object-contain" />
          ) : isCloudflareVideoId(currentMedia.url) ||
            currentMedia.url.includes('cloudflarestream.com') ? (
            <iframe
              src={
                isCloudflareVideoId(currentMedia.url)
                  ? getCloudflareVideoUrl(currentMedia.url)
                  : currentMedia.url
              }
              className="w-full h-full"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video src={currentMedia.url} controls className="w-full h-full object-contain" />
          )}

          {/* Media Navigation */}
          {hasMultipleMedia && (
            <>
              <button
                onClick={handlePrevMedia}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                onClick={handleNextMedia}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 rounded-full flex items-center justify-center text-white hover:bg-black/70"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>

              {/* Media Dots */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {post.media?.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={`w-2 h-2 rounded-full ${
                      index === currentMediaIndex ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content - shown AFTER media */}
      {post.content && (
        <div className="px-4 py-3">
          <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 flex items-center gap-6 border-t border-gray-100">
        <div className="flex items-center gap-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          </svg>
          <span className="text-sm">{post.likeCount}</span>
        </div>

        <div className="flex items-center gap-1 text-gray-500">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span className="text-sm">{post.commentCount}</span>
        </div>
      </div>
    </div>
  );
}
