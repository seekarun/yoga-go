/**
 * Cloudflare Stream Client
 *
 * Server-side operations for uploading and managing videos on Cloudflare Stream.
 * Used by Lambda functions and API routes.
 */

// Environment variables
const CF_TOKEN = process.env.CF_TOKEN;
const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;

const CLOUDFLARE_API_BASE = 'https://api.cloudflare.com/client/v4';

interface CloudflareApiResponse<T = unknown> {
  success: boolean;
  errors: Array<{ code: number; message: string }>;
  messages: string[];
  result: T;
}

interface DirectUploadResult {
  uploadURL: string;
  uid: string;
  watermark?: { uid: string };
}

interface VideoDetails {
  uid: string;
  thumbnail: string;
  thumbnailTimestampPct?: number;
  readyToStream: boolean;
  status: {
    state: 'queued' | 'downloading' | 'inprogress' | 'pendingupload' | 'ready' | 'error';
    pctComplete?: string;
    errorReasonCode?: string;
    errorReasonText?: string;
  };
  meta: Record<string, unknown>;
  created: string;
  modified: string;
  size?: number;
  preview?: string;
  playback?: {
    hls: string;
    dash: string;
  };
  duration?: number;
  input?: {
    width: number;
    height: number;
  };
}

interface UploadFromUrlResult {
  uid: string;
  thumbnail?: string;
  thumbnailTimestampPct?: number;
  readyToStream?: boolean;
  status?: {
    state: string;
  };
  meta?: Record<string, unknown>;
  created?: string;
}

/**
 * Validate that environment variables are configured
 */
function validateConfig(): void {
  if (!CF_TOKEN) {
    throw new Error('CF_TOKEN environment variable is not configured');
  }
  if (!CF_ACCOUNT_ID) {
    throw new Error('CF_ACCOUNT_ID environment variable is not configured');
  }
}

/**
 * Make authenticated request to Cloudflare API
 */
async function cloudflareRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<CloudflareApiResponse<T>> {
  validateConfig();

  const url = `${CLOUDFLARE_API_BASE}/accounts/${CF_ACCOUNT_ID}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${CF_TOKEN}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data: CloudflareApiResponse<T> = await response.json();

  if (!data.success) {
    const errorMessage = data.errors?.[0]?.message || 'Cloudflare API error';
    console.error('[DBG][cloudflare-stream] API error:', data.errors);
    throw new Error(errorMessage);
  }

  return data;
}

/**
 * Generate a direct upload URL for client-side uploads
 * Returns a one-time upload URL that the client can POST to
 */
export async function getDirectUploadUrl(
  maxDurationSeconds: number = 3600
): Promise<DirectUploadResult> {
  console.log('[DBG][cloudflare-stream] Generating direct upload URL');

  const response = await cloudflareRequest<DirectUploadResult>('/stream/direct_upload', {
    method: 'POST',
    body: JSON.stringify({
      maxDurationSeconds,
      requireSignedURLs: false,
    }),
  });

  console.log('[DBG][cloudflare-stream] Direct upload URL generated:', response.result.uid);
  return response.result;
}

/**
 * Upload a video from a URL (Cloudflare will fetch from the URL)
 * This is ideal for importing recordings from Zoom/Google Drive
 *
 * @param sourceUrl - The URL to fetch the video from
 * @param meta - Optional metadata to attach to the video
 * @returns The video UID and initial status
 */
export async function uploadFromUrl(
  sourceUrl: string,
  meta?: Record<string, string>
): Promise<UploadFromUrlResult> {
  console.log('[DBG][cloudflare-stream] Uploading from URL');

  const response = await cloudflareRequest<UploadFromUrlResult>('/stream/copy', {
    method: 'POST',
    body: JSON.stringify({
      url: sourceUrl,
      meta: meta || {},
      requireSignedURLs: false,
    }),
  });

  console.log('[DBG][cloudflare-stream] Upload started:', response.result.uid);
  return response.result;
}

/**
 * Get video details and status
 */
export async function getVideoDetails(videoId: string): Promise<VideoDetails> {
  console.log('[DBG][cloudflare-stream] Getting video details:', videoId);

  const response = await cloudflareRequest<VideoDetails>(`/stream/${videoId}`);

  console.log('[DBG][cloudflare-stream] Video status:', response.result.status.state);
  return response.result;
}

/**
 * Check if a video is ready for playback
 */
export async function isVideoReady(videoId: string): Promise<boolean> {
  const details = await getVideoDetails(videoId);
  return details.readyToStream;
}

/**
 * Get the playback URL for a video
 */
export async function getPlaybackUrl(videoId: string): Promise<string | null> {
  const details = await getVideoDetails(videoId);

  if (details.playback?.hls) {
    return details.playback.hls;
  }

  // Construct default playback URL
  if (details.readyToStream) {
    return `https://customer-${CF_ACCOUNT_ID}.cloudflarestream.com/${videoId}/manifest/video.m3u8`;
  }

  return null;
}

/**
 * Get the thumbnail URL for a video
 */
export function getThumbnailUrl(videoId: string, timestamp: number = 0): string {
  // Cloudflare Stream thumbnail URL format
  return `https://customer-${CF_ACCOUNT_ID}.cloudflarestream.com/${videoId}/thumbnails/thumbnail.jpg?time=${timestamp}s`;
}

/**
 * Get the embed URL for a video
 */
export function getEmbedUrl(videoId: string): string {
  return `https://customer-${CF_ACCOUNT_ID}.cloudflarestream.com/${videoId}/iframe`;
}

/**
 * Delete a video from Cloudflare Stream
 */
export async function deleteVideo(videoId: string): Promise<void> {
  console.log('[DBG][cloudflare-stream] Deleting video:', videoId);

  await cloudflareRequest(`/stream/${videoId}`, {
    method: 'DELETE',
  });

  console.log('[DBG][cloudflare-stream] Video deleted:', videoId);
}

/**
 * Update video metadata
 */
export async function updateVideoMeta(
  videoId: string,
  meta: Record<string, string>
): Promise<VideoDetails> {
  console.log('[DBG][cloudflare-stream] Updating video metadata:', videoId);

  const response = await cloudflareRequest<VideoDetails>(`/stream/${videoId}`, {
    method: 'POST',
    body: JSON.stringify({ meta }),
  });

  console.log('[DBG][cloudflare-stream] Metadata updated');
  return response.result;
}

/**
 * List all videos (paginated)
 */
export async function listVideos(options?: {
  limit?: number;
  after?: string;
  before?: string;
  search?: string;
}): Promise<{ videos: VideoDetails[]; total: number }> {
  console.log('[DBG][cloudflare-stream] Listing videos');

  const params = new URLSearchParams();
  if (options?.limit) params.set('limit', options.limit.toString());
  if (options?.after) params.set('after', options.after);
  if (options?.before) params.set('before', options.before);
  if (options?.search) params.set('search', options.search);

  const queryString = params.toString();
  const endpoint = queryString ? `/stream?${queryString}` : '/stream';

  const response = await cloudflareRequest<VideoDetails[]>(endpoint);

  return {
    videos: response.result,
    total: response.result.length,
  };
}

/**
 * Create a signed URL for video access (requires signed URLs to be enabled)
 * Note: This requires the video to have requireSignedURLs: true
 */
export async function createSignedUrl(
  videoId: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  console.log('[DBG][cloudflare-stream] Creating signed URL for:', videoId);

  // This would require using the Cloudflare Stream signing key
  // For now, we use unsigned URLs (requireSignedURLs: false)
  throw new Error('Signed URLs not implemented - using unsigned URLs');
}

/**
 * Poll for video to be ready (with timeout)
 * Useful after uploading from URL
 */
export async function waitForVideoReady(
  videoId: string,
  options?: {
    maxWaitMs?: number;
    pollIntervalMs?: number;
  }
): Promise<VideoDetails> {
  const maxWait = options?.maxWaitMs ?? 300000; // 5 minutes default
  const pollInterval = options?.pollIntervalMs ?? 5000; // 5 seconds default

  console.log('[DBG][cloudflare-stream] Waiting for video to be ready:', videoId);

  const startTime = Date.now();

  while (Date.now() - startTime < maxWait) {
    const details = await getVideoDetails(videoId);

    if (details.readyToStream) {
      console.log('[DBG][cloudflare-stream] Video is ready:', videoId);
      return details;
    }

    if (details.status.state === 'error') {
      throw new Error(
        `Video processing failed: ${details.status.errorReasonText || 'Unknown error'}`
      );
    }

    console.log(
      '[DBG][cloudflare-stream] Video still processing:',
      videoId,
      details.status.state,
      details.status.pctComplete
    );

    // Wait before polling again
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Timeout waiting for video to be ready after ${maxWait}ms`);
}
