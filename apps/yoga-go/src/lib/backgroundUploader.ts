/**
 * Background Uploader Service - Singleton pattern for persistent uploads
 *
 * Handles XHR uploads that continue even when components unmount.
 * Stores upload references and emits events for status changes.
 */

import type { PendingUpload } from './uploadManager';
import {
  addPendingUpload,
  updateUploadProgress,
  updateUploadStatus,
  generateUploadId,
} from './uploadManager';

export interface UploadParams {
  file: File;
  uploadUrl: string;
  videoId: string;
  entityType: PendingUpload['entityType'];
  entityId: string;
  parentId?: string;
  onProgress?: (progress: number) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export interface ActiveUpload {
  id: string;
  xhr: XMLHttpRequest;
  params: UploadParams;
  progress: number;
}

type UploadEventType = 'progress' | 'complete' | 'error' | 'start';

interface UploadEventCallback {
  (uploadId: string, data?: { progress?: number; error?: string }): void;
}

class BackgroundUploader {
  private static instance: BackgroundUploader;
  private uploads: Map<string, ActiveUpload> = new Map();
  private listeners: Map<UploadEventType, Set<UploadEventCallback>> = new Map();

  private constructor() {
    // Initialize listener maps
    this.listeners.set('progress', new Set());
    this.listeners.set('complete', new Set());
    this.listeners.set('error', new Set());
    this.listeners.set('start', new Set());

    console.log('[DBG][backgroundUploader] Singleton initialized');
  }

  static getInstance(): BackgroundUploader {
    if (!BackgroundUploader.instance) {
      BackgroundUploader.instance = new BackgroundUploader();
    }
    return BackgroundUploader.instance;
  }

  /**
   * Start a new background upload
   */
  async startUpload(params: UploadParams): Promise<string> {
    const uploadId = generateUploadId();

    console.log('[DBG][backgroundUploader] Starting upload:', {
      uploadId,
      fileName: params.file.name,
      fileSize: params.file.size,
      entityType: params.entityType,
      entityId: params.entityId,
    });

    // Create pending upload record in IndexedDB
    const pendingUpload: PendingUpload = {
      id: uploadId,
      entityType: params.entityType,
      entityId: params.entityId,
      parentId: params.parentId,
      cloudflareVideoId: params.videoId,
      status: 'uploading',
      progress: 0,
      fileName: params.file.name,
      fileSize: params.file.size,
      startedAt: new Date().toISOString(),
    };

    await addPendingUpload(pendingUpload);

    // Create XHR for upload
    const xhr = new XMLHttpRequest();

    // Set up progress handler
    xhr.upload.onprogress = async event => {
      if (event.lengthComputable) {
        const progress = Math.round((event.loaded / event.total) * 100);
        const activeUpload = this.uploads.get(uploadId);
        if (activeUpload) {
          activeUpload.progress = progress;
        }

        // Update IndexedDB (throttled)
        if (progress % 10 === 0 || progress === 100) {
          await updateUploadProgress(uploadId, progress);
        }

        // Notify callbacks
        params.onProgress?.(progress);
        this.emit('progress', uploadId, { progress });
      }
    };

    // Set up completion handler
    xhr.onload = async () => {
      this.uploads.delete(uploadId);

      if (xhr.status >= 200 && xhr.status < 300) {
        console.log('[DBG][backgroundUploader] Upload completed successfully:', uploadId);
        await updateUploadStatus(uploadId, 'processing');
        params.onComplete?.();
        this.emit('complete', uploadId);
      } else {
        const errorMsg = `Upload failed with status ${xhr.status}`;
        console.error('[DBG][backgroundUploader] Upload failed:', uploadId, errorMsg);
        await updateUploadStatus(uploadId, 'error', errorMsg);
        params.onError?.(errorMsg);
        this.emit('error', uploadId, { error: errorMsg });
      }
    };

    // Set up error handler
    xhr.onerror = async () => {
      this.uploads.delete(uploadId);
      const errorMsg = 'Network error during upload';
      console.error('[DBG][backgroundUploader] Upload network error:', uploadId);
      await updateUploadStatus(uploadId, 'error', errorMsg);
      params.onError?.(errorMsg);
      this.emit('error', uploadId, { error: errorMsg });
    };

    // Set up abort handler
    xhr.onabort = async () => {
      this.uploads.delete(uploadId);
      const errorMsg = 'Upload was cancelled';
      console.log('[DBG][backgroundUploader] Upload cancelled:', uploadId);
      await updateUploadStatus(uploadId, 'error', errorMsg);
      params.onError?.(errorMsg);
      this.emit('error', uploadId, { error: errorMsg });
    };

    // Store active upload
    const activeUpload: ActiveUpload = {
      id: uploadId,
      xhr,
      params,
      progress: 0,
    };
    this.uploads.set(uploadId, activeUpload);

    // Start upload
    xhr.open('POST', params.uploadUrl);
    xhr.setRequestHeader('Content-Type', params.file.type || 'video/mp4');

    const formData = new FormData();
    formData.append('file', params.file);
    xhr.send(formData);

    this.emit('start', uploadId);

    return uploadId;
  }

  /**
   * Cancel an active upload
   */
  cancelUpload(uploadId: string): boolean {
    const activeUpload = this.uploads.get(uploadId);
    if (activeUpload) {
      console.log('[DBG][backgroundUploader] Cancelling upload:', uploadId);
      activeUpload.xhr.abort();
      return true;
    }
    return false;
  }

  /**
   * Get all active uploads
   */
  getActiveUploads(): ActiveUpload[] {
    return Array.from(this.uploads.values());
  }

  /**
   * Get a specific active upload
   */
  getActiveUpload(uploadId: string): ActiveUpload | undefined {
    return this.uploads.get(uploadId);
  }

  /**
   * Check if there are any active uploads
   */
  hasActiveUploads(): boolean {
    return this.uploads.size > 0;
  }

  /**
   * Subscribe to upload events
   */
  on(event: UploadEventType, callback: UploadEventCallback): () => void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.add(callback);
    }

    // Return unsubscribe function
    return () => {
      listeners?.delete(callback);
    };
  }

  /**
   * Emit an event to all listeners
   */
  private emit(
    event: UploadEventType,
    uploadId: string,
    data?: { progress?: number; error?: string }
  ): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(uploadId, data);
        } catch (err) {
          console.error('[DBG][backgroundUploader] Error in event listener:', err);
        }
      });
    }
  }
}

// Export singleton getter
export function getBackgroundUploader(): BackgroundUploader {
  return BackgroundUploader.getInstance();
}

// Export convenience function for starting uploads
export async function startBackgroundUpload(params: UploadParams): Promise<string> {
  return getBackgroundUploader().startUpload(params);
}

// Export convenience function for cancelling uploads
export function cancelBackgroundUpload(uploadId: string): boolean {
  return getBackgroundUploader().cancelUpload(uploadId);
}
