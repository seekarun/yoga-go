'use client';

import { useState, useEffect, useCallback } from 'react';

export interface VideoUploadResult {
  videoId: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  duration?: string;
  errorReason?: string;
}

interface VideoUploadProps {
  label?: string;
  maxDurationSeconds?: number;
  videoId?: string;
  videoStatus?: 'uploading' | 'processing' | 'ready' | 'error' | '';
  onUploadComplete: (result: VideoUploadResult) => void;
  onClear?: () => void;
  onError?: (error: string) => void;
  helpText?: string;
  className?: string;
}

// Helper function to format duration from seconds to MM:SS
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function VideoUpload({
  label = 'Video Upload',
  maxDurationSeconds = 7200,
  videoId,
  videoStatus,
  onUploadComplete,
  onClear,
  onError,
  helpText,
  className = '',
}: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [pollingVideoId, setPollingVideoId] = useState<string | null>(null);
  const [internalStatus, setInternalStatus] = useState<
    'uploading' | 'processing' | 'ready' | 'error' | ''
  >(videoStatus || '');
  const [duration, setDuration] = useState<string>('');
  const [errorReason, setErrorReason] = useState<string>('');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Sync internal status with prop
  useEffect(() => {
    if (videoStatus) {
      setInternalStatus(videoStatus);
    }
  }, [videoStatus]);

  // Poll video status for processing videos
  useEffect(() => {
    if (!pollingVideoId) return;

    const pollInterval = setInterval(async () => {
      try {
        console.log('[DBG][VideoUpload] Polling video status for:', pollingVideoId);

        const response = await fetch(`/api/cloudflare/video-status/${pollingVideoId}`);
        const data = await response.json();

        if (data.success) {
          const status = data.data.status;
          const isReady = data.data.readyToStream;
          const videoDuration = data.data.duration;
          const errorReasonCode = data.data.errorReasonCode;
          const errorReasonText = data.data.errorReasonText;

          console.log(
            '[DBG][VideoUpload] Video status:',
            status,
            'Ready:',
            isReady,
            'Error:',
            errorReasonCode,
            errorReasonText
          );

          const newStatus = isReady ? 'ready' : status === 'error' ? 'error' : 'processing';
          setInternalStatus(newStatus);

          // Capture error reason if available
          if (status === 'error') {
            const errorMsg = errorReasonText || errorReasonCode || 'Unknown processing error';
            setErrorReason(errorMsg);
          }

          // Auto-populate duration if available
          if (videoDuration && !duration) {
            const formattedDuration = formatDuration(videoDuration);
            setDuration(formattedDuration);
          }

          // If ready or error, stop polling and notify parent
          if (isReady || status === 'error') {
            console.log('[DBG][VideoUpload] Video processing complete, stopping poll');
            setPollingVideoId(null);

            onUploadComplete({
              videoId: pollingVideoId,
              status: newStatus as 'ready' | 'error',
              duration: videoDuration ? formatDuration(videoDuration) : undefined,
              errorReason:
                status === 'error'
                  ? errorReasonText || errorReasonCode || 'Unknown error'
                  : undefined,
            });
          }
        }
      } catch (err) {
        console.error('[DBG][VideoUpload] Error polling video status:', err);
      }
    }, 10000); // Poll every 10 seconds

    return () => clearInterval(pollInterval);
  }, [pollingVideoId, duration, onUploadComplete]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[DBG][VideoUpload] File selected:', file.name, file.size);
      setSelectedFile(file);
    }
  };

  const handleVideoUpload = useCallback(async () => {
    if (!selectedFile) {
      onError?.('Please select a video file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setInternalStatus('uploading');

    try {
      console.log('[DBG][VideoUpload] Starting video upload');

      // Step 1: Get upload URL from our API
      const uploadUrlResponse = await fetch('/api/cloudflare/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxDurationSeconds }),
      });

      const uploadUrlData = await uploadUrlResponse.json();
      if (!uploadUrlData.success) {
        throw new Error(uploadUrlData.error || 'Failed to get upload URL');
      }

      const { uploadURL, uid } = uploadUrlData.data;
      console.log('[DBG][VideoUpload] Got upload URL for video:', uid);

      // Step 2: Upload video to Cloudflare
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const percentComplete = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percentComplete);
          console.log('[DBG][VideoUpload] Upload progress:', percentComplete, '%');
        }
      });

      await new Promise<void>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Upload failed'));
        });

        xhr.open('POST', uploadURL);
        xhr.send(formData);
      });

      console.log('[DBG][VideoUpload] Video uploaded successfully:', uid);

      // Step 3: Fetch video status immediately to get duration
      let videoDuration: string | undefined;
      try {
        const statusResponse = await fetch(`/api/cloudflare/video-status/${uid}`);
        const statusData = await statusResponse.json();

        if (statusData.success && statusData.data.duration) {
          videoDuration = formatDuration(statusData.data.duration);
          setDuration(videoDuration);
          console.log('[DBG][VideoUpload] Video duration:', videoDuration);
        }
      } catch (statusErr) {
        console.error('[DBG][VideoUpload] Error fetching video status:', statusErr);
      }

      setUploadProgress(100);
      setInternalStatus('processing');

      // Notify parent of upload complete (processing state)
      onUploadComplete({
        videoId: uid,
        status: 'processing',
        duration: videoDuration,
      });

      // Start polling for video status
      console.log('[DBG][VideoUpload] Starting status polling for:', uid);
      setPollingVideoId(uid);

      // Show success message
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 4000);
    } catch (err) {
      console.error('[DBG][VideoUpload] Error uploading video:', err);
      setInternalStatus('error');
      onError?.(err instanceof Error ? err.message : 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  }, [selectedFile, maxDurationSeconds, onUploadComplete, onError]);

  const handleClear = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setInternalStatus('');
    setDuration('');
    setErrorReason('');
    setPollingVideoId(null);
    onClear?.();
  };

  const getStatusColor = () => {
    switch (internalStatus) {
      case 'ready':
        return 'bg-green-50 border-green-200';
      case 'processing':
        return 'bg-orange-50 border-orange-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getStatusTextColor = () => {
    switch (internalStatus) {
      case 'ready':
        return 'text-green-800';
      case 'processing':
        return 'text-orange-800';
      case 'error':
        return 'text-red-800';
      default:
        return 'text-blue-800';
    }
  };

  const getStatusIcon = () => {
    switch (internalStatus) {
      case 'ready':
        return '✓';
      case 'processing':
        return '⟳';
      case 'error':
        return '⚠';
      default:
        return '↑';
    }
  };

  const getStatusText = () => {
    switch (internalStatus) {
      case 'ready':
        return 'Video ready';
      case 'processing':
        return 'Processing video...';
      case 'error':
        return 'Upload error';
      default:
        return 'Video uploaded';
    }
  };

  const getIconColor = () => {
    switch (internalStatus) {
      case 'ready':
        return 'text-green-600';
      case 'processing':
        return 'text-orange-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>

      {videoId ? (
        <div
          className={`mb-4 p-4 rounded-lg border ${getStatusColor()} ${
            internalStatus === 'processing' ? 'video-processing-pulse' : ''
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={getIconColor()}>{getStatusIcon()}</span>
            <span className={`text-sm font-medium ${getStatusTextColor()}`}>{getStatusText()}</span>
          </div>
          <p className="text-sm text-gray-600">Video ID: {videoId}</p>
          {internalStatus && (
            <p
              className={`text-sm font-medium ${
                internalStatus === 'ready'
                  ? 'text-green-700'
                  : internalStatus === 'processing'
                    ? 'text-orange-700'
                    : internalStatus === 'error'
                      ? 'text-red-700'
                      : 'text-gray-600'
              }`}
            >
              Status: {internalStatus}
              {internalStatus === 'error' && errorReason && (
                <span className="block text-xs mt-1">Reason: {errorReason}</span>
              )}
            </p>
          )}
          {duration && (
            <p className="text-sm font-medium text-blue-700 mt-2">⏱️ Duration: {duration}</p>
          )}
          <button
            type="button"
            onClick={handleClear}
            className="mt-2 text-sm text-blue-600 hover:text-blue-700"
          >
            Upload different video
          </button>
        </div>
      ) : (
        <>
          <input
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {selectedFile && (
            <div className="mt-2">
              <p className="text-sm text-gray-600">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
              <button
                type="button"
                onClick={handleVideoUpload}
                disabled={isUploading}
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {isUploading ? 'Uploading...' : 'Upload Video'}
              </button>
            </div>
          )}
          {isUploading && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-1">{uploadProgress}% uploaded</p>
            </div>
          )}
        </>
      )}

      {helpText && <p className="text-sm text-gray-500 mt-2">{helpText}</p>}

      {/* Success message */}
      {showSuccessMessage && (
        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✓ Video uploaded successfully! Processing status will update automatically.
          </p>
        </div>
      )}

      {/* Pulsing Animation for Processing Status */}
      <style jsx>{`
        @keyframes gentle-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.85;
            transform: scale(0.995);
          }
        }

        .video-processing-pulse {
          animation: gentle-pulse 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
