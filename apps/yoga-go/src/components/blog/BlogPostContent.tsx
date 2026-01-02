'use client';

import Image from 'next/image';
import type { PostMedia } from '@/types';
import { useState } from 'react';

const CF_SUBDOMAIN = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'iq7mgkvtb3bwxqf5';

// Check if URL is a Cloudflare video ID (32 char hex)
const isCloudflareVideoId = (url: string) => /^[a-f0-9]{32}$/.test(url);

// Get Cloudflare iframe URL from video ID
const getCloudflareVideoUrl = (videoId: string) =>
  `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;

interface BlogPostContentProps {
  content: string;
  media?: PostMedia[];
}

export default function BlogPostContent({ content, media }: BlogPostContentProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);

  const hasMedia = media && media.length > 0;
  const hasMultipleMedia = media && media.length > 1;
  const currentMedia = hasMedia ? media[currentMediaIndex] : null;

  const handlePrevMedia = () => {
    setCurrentMediaIndex(prev => (prev > 0 ? prev - 1 : (media?.length || 1) - 1));
  };

  const handleNextMedia = () => {
    setCurrentMediaIndex(prev => (prev < (media?.length || 1) - 1 ? prev + 1 : 0));
  };

  return (
    <div>
      {/* Text Content */}
      {content && <div className="whitespace-pre-wrap text-lg leading-relaxed mb-6">{content}</div>}

      {/* Media */}
      {hasMedia && currentMedia && (
        <div className="relative rounded-lg overflow-hidden">
          {currentMedia.type === 'image' ? (
            <div className="relative aspect-square bg-gray-100">
              <Image src={currentMedia.url} alt="Post media" fill className="object-cover" />
            </div>
          ) : currentMedia.type === 'video' ? (
            <div className="relative aspect-square bg-black">
              {isCloudflareVideoId(currentMedia.url) ||
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
            </div>
          ) : null}

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
                {media?.map((_, index) => (
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
    </div>
  );
}
