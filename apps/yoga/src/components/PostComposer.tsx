'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import type { Post, PostMedia, PostStatus } from '@/types';

interface PostComposerProps {
  expertId: string;
  initialPost?: Post;
  onSave: (data: { content: string; media: PostMedia[]; status: PostStatus }) => Promise<void>;
  onCancel: () => void;
  isSaving?: boolean;
}

const MAX_CONTENT_LENGTH = 500;
const MAX_MEDIA_ITEMS = 10;
const CF_SUBDOMAIN = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'iq7mgkvtb3bwxqf5';

// Check if URL is a Cloudflare Stream video ID (not a full URL)
const isCloudflareVideoId = (url: string) => {
  return !url.startsWith('http') && url.length === 32;
};

// Construct Cloudflare Stream iframe URL from video ID
const getCloudflareVideoUrl = (videoId: string) => {
  return `https://customer-${CF_SUBDOMAIN}.cloudflarestream.com/${videoId}/iframe`;
};

// Video processing status type
type VideoStatus = 'uploading' | 'processing' | 'ready' | 'error';

export default function PostComposer({
  initialPost,
  onSave,
  onCancel,
  isSaving = false,
}: PostComposerProps) {
  const [content, setContent] = useState(initialPost?.content || '');
  const [media, setMedia] = useState<PostMedia[]>(initialPost?.media || []);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if any videos are still processing
  const hasProcessingVideos = Object.values(videoStatuses).some(
    status => status === 'uploading' || status === 'processing'
  );

  // Poll video status for processing videos
  useEffect(() => {
    // Get video IDs that need polling (uploading or processing)
    const videoIdsToPoll = Object.entries(videoStatuses)
      .filter(([_, status]) => status === 'uploading' || status === 'processing')
      .map(([id]) => id);

    if (videoIdsToPoll.length === 0) return;

    console.log('[DBG][PostComposer] Starting poll for videos:', videoIdsToPoll);

    const pollInterval = setInterval(async () => {
      for (const videoId of videoIdsToPoll) {
        try {
          console.log('[DBG][PostComposer] Polling video status for:', videoId);
          const response = await fetch(`/api/cloudflare/video-status/${videoId}`);
          const data = await response.json();

          if (data.success) {
            const isReady = data.data.readyToStream;
            const status = data.data.status;

            console.log('[DBG][PostComposer] Video status:', status, 'Ready:', isReady);

            if (isReady) {
              setVideoStatuses(prev => ({ ...prev, [videoId]: 'ready' }));
            } else if (status === 'error') {
              setVideoStatuses(prev => ({ ...prev, [videoId]: 'error' }));
            }
            // Otherwise keep as processing
          }
        } catch (err) {
          console.error('[DBG][PostComposer] Error polling video status:', err);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [videoStatuses]);

  const remainingChars = MAX_CONTENT_LENGTH - content.length;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_CONTENT_LENGTH) {
      setContent(value);
    }
  };

  const uploadImage = async (file: File): Promise<{ url: string } | null> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/cloudflare/images/direct-upload', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    if (result.success && result.data?.url) {
      return { url: result.data.url };
    }
    console.error('[DBG][PostComposer] Image upload failed:', result.error);
    return null;
  };

  const uploadVideo = async (file: File): Promise<{ url: string } | null> => {
    // Step 1: Get direct upload URL from Cloudflare Stream
    const uploadUrlResponse = await fetch('/api/cloudflare/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxDurationSeconds: 600 }), // 10 min max
    });

    const uploadUrlResult = await uploadUrlResponse.json();
    if (!uploadUrlResult.success) {
      console.error('[DBG][PostComposer] Failed to get upload URL:', uploadUrlResult.error);
      return null;
    }

    const { uploadURL, uid } = uploadUrlResult.data;
    console.log('[DBG][PostComposer] Got upload URL for video:', uid);

    // Set initial status to uploading
    setVideoStatuses(prev => ({ ...prev, [uid]: 'uploading' }));

    // Step 2: Upload video to Cloudflare Stream
    const formData = new FormData();
    formData.append('file', file);

    const uploadResponse = await fetch(uploadURL, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      console.error('[DBG][PostComposer] Video upload failed');
      setVideoStatuses(prev => ({ ...prev, [uid]: 'error' }));
      return null;
    }

    console.log('[DBG][PostComposer] Video uploaded, now processing:', uid);
    // Set status to processing - polling will update when ready
    setVideoStatuses(prev => ({ ...prev, [uid]: 'processing' }));

    // Return just the video ID (not full URL) - we'll construct URL when displaying
    return { url: uid };
  };

  const handleMediaUpload = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      if (media.length >= MAX_MEDIA_ITEMS) {
        alert(`Maximum ${MAX_MEDIA_ITEMS} media items allowed`);
        return;
      }

      const remainingSlots = MAX_MEDIA_ITEMS - media.length;
      const filesToUpload = Array.from(files).slice(0, remainingSlots);

      setUploadingMedia(true);

      try {
        for (const file of filesToUpload) {
          const isVideo = file.type.startsWith('video/');

          let result: { url: string } | null = null;

          if (isVideo) {
            result = await uploadVideo(file);
          } else {
            result = await uploadImage(file);
          }

          if (result) {
            setMedia(prev => [
              ...prev,
              {
                type: isVideo ? 'video' : 'image',
                url: result.url,
              },
            ]);
          }
        }
      } catch (err) {
        console.error('[DBG][PostComposer] Upload error:', err);
      } finally {
        setUploadingMedia(false);
      }
    },
    [media.length]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleMediaUpload(e.dataTransfer.files);
    },
    [handleMediaUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeMedia = (index: number) => {
    const removedItem = media[index];
    // If it's a video, clean up its status tracking
    if (removedItem.type === 'video' && isCloudflareVideoId(removedItem.url)) {
      setVideoStatuses(prev => {
        const newStatuses = { ...prev };
        delete newStatuses[removedItem.url];
        return newStatuses;
      });
    }
    setMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (status: PostStatus) => {
    if (!content.trim() && media.length === 0) {
      alert('Please add some content or media');
      return;
    }

    await onSave({
      content: content.trim(),
      media,
      status,
    });
  };

  const canAddMore = media.length < MAX_MEDIA_ITEMS && !isSaving && !uploadingMedia;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={e => handleMediaUpload(e.target.files)}
        disabled={!canAddMore}
      />

      {/* Media Section - TOP */}
      <div className="p-4 bg-gray-50">
        {media.length === 0 ? (
          /* Empty state - drop zone */
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-gray-400 transition-colors bg-white"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {uploadingMedia ? (
              <div className="flex flex-col items-center justify-center gap-2 text-gray-500">
                <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Uploading...</span>
              </div>
            ) : (
              <>
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-gray-500">Drop images/videos here or click to upload</p>
              </>
            )}
          </div>
        ) : (
          /* Media preview with highlight */
          <div>
            {/* Main/Highlighted Media (first item) */}
            <div
              className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gray-200 mb-3"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              {media[0].type === 'image' ? (
                <Image src={media[0].url} alt="Main media" fill className="object-cover" />
              ) : isCloudflareVideoId(media[0].url) ? (
                // Video ID - check processing status
                (() => {
                  const status = videoStatuses[media[0].url];
                  const isReady = status === 'ready';
                  const isError = status === 'error';

                  if (isReady) {
                    return (
                      <iframe
                        src={getCloudflareVideoUrl(media[0].url)}
                        className="w-full h-full"
                        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }

                  // Processing or error state
                  return (
                    <div className="w-full h-full bg-gray-800 flex flex-col items-center justify-center">
                      {isError ? (
                        <>
                          <svg
                            className="w-12 h-12 text-red-400 mb-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <p className="text-red-400 text-sm">Video processing failed</p>
                        </>
                      ) : (
                        <>
                          <svg
                            className="animate-spin h-10 w-10 text-white mb-3"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          <p className="text-white text-sm">
                            {status === 'uploading' ? 'Uploading video...' : 'Processing video...'}
                          </p>
                          <p className="text-gray-400 text-xs mt-1">This may take a moment</p>
                        </>
                      )}
                    </div>
                  );
                })()
              ) : (
                <video src={media[0].url} className="w-full h-full object-cover" controls />
              )}
              <button
                onClick={() => removeMedia(0)}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                disabled={isSaving}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
              {media[0].type === 'video' && (
                <div
                  className={`absolute bottom-2 left-2 px-2 py-1 rounded text-xs text-white ${
                    videoStatuses[media[0].url] === 'processing' ||
                    videoStatuses[media[0].url] === 'uploading'
                      ? 'bg-yellow-500 text-yellow-900'
                      : videoStatuses[media[0].url] === 'error'
                        ? 'bg-red-500'
                        : 'bg-black/60'
                  }`}
                >
                  {videoStatuses[media[0].url] === 'uploading'
                    ? 'Uploading...'
                    : videoStatuses[media[0].url] === 'processing'
                      ? 'Processing...'
                      : videoStatuses[media[0].url] === 'error'
                        ? 'Error'
                        : 'Video'}
                </div>
              )}
            </div>

            {/* Thumbnails row (remaining items + add more) */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {media.slice(1).map((item, index) => (
                <div
                  key={index + 1}
                  className="relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-gray-200"
                >
                  {item.type === 'image' ? (
                    <Image
                      src={item.url}
                      alt={`Media ${index + 2}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        videoStatuses[item.url] === 'error' ? 'bg-red-900' : 'bg-gray-800'
                      }`}
                    >
                      {videoStatuses[item.url] === 'uploading' ||
                      videoStatuses[item.url] === 'processing' ? (
                        <svg className="animate-spin w-6 h-6 text-white" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : videoStatuses[item.url] === 'error' ? (
                        <svg
                          className="w-6 h-6 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-8 h-8 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => removeMedia(index + 1)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                    disabled={isSaving}
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                  {item.type === 'video' && (
                    <div
                      className={`absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded text-[10px] text-white ${
                        videoStatuses[item.url] === 'processing' ||
                        videoStatuses[item.url] === 'uploading'
                          ? 'bg-yellow-500 text-yellow-900'
                          : videoStatuses[item.url] === 'error'
                            ? 'bg-red-500'
                            : 'bg-black/60'
                      }`}
                    >
                      {videoStatuses[item.url] === 'uploading'
                        ? 'Up...'
                        : videoStatuses[item.url] === 'processing'
                          ? 'Proc...'
                          : videoStatuses[item.url] === 'error'
                            ? 'Err'
                            : 'Video'}
                    </div>
                  )}
                </div>
              ))}

              {/* Add more button */}
              {canAddMore && (
                <div
                  className="flex-shrink-0 w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors bg-white"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploadingMedia ? (
                    <svg className="animate-spin h-6 w-6 text-gray-400" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-6 h-6 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Input */}
      <div className="p-4 border-t border-gray-100">
        <textarea
          value={content}
          onChange={handleContentChange}
          placeholder="What's on your mind?"
          className="w-full resize-none border border-gray-200 rounded-lg p-3 focus:ring-2 focus:ring-primary/20 focus:border-primary text-base placeholder-gray-400"
          rows={3}
          disabled={isSaving}
        />

        {/* Character Counter */}
        <div className="flex justify-end mt-1">
          <span className={`text-sm ${remainingChars < 50 ? 'text-orange-500' : 'text-gray-400'}`}>
            {remainingChars}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          disabled={isSaving}
        >
          Cancel
        </button>

        <button
          onClick={() => handleSubmit('published')}
          className="px-6 py-2 text-sm text-white rounded-lg disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
          disabled={isSaving || hasProcessingVideos || (!content.trim() && media.length === 0)}
        >
          {isSaving ? 'Posting...' : hasProcessingVideos ? 'Processing...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
