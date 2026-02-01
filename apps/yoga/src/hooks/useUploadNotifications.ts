'use client';

/**
 * Upload Notifications Hook
 *
 * Monitors IndexedDB for completed/failed uploads and shows toast notifications.
 * Also syncs with server to update IndexedDB statuses for uploads that completed
 * while the browser was closed.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/Toast';
import {
  initUploadDB,
  getPendingUploads,
  updateUploadStatus,
  removePendingUpload,
  type PendingUpload,
} from '@/lib/uploadManager';
import { getBackgroundUploader } from '@/lib/backgroundUploader';

const POLL_INTERVAL = 30000; // 30 seconds
const SYNC_INTERVAL = 60000; // 60 seconds

export function useUploadNotifications() {
  const { showToast } = useToast();
  const hasInitialized = useRef(false);
  const lastSyncTime = useRef(0);

  /**
   * Sync IndexedDB statuses with server
   * For uploads that completed while browser was closed
   */
  const syncWithServer = useCallback(async () => {
    try {
      const uploads = await getPendingUploads();
      const processingUploads = uploads.filter(
        u => u.status === 'uploading' || u.status === 'processing'
      );

      if (processingUploads.length === 0) {
        return;
      }

      // Get unique video IDs
      const videoIds = processingUploads.map(u => u.cloudflareVideoId);

      // Fetch current statuses from server
      const response = await fetch('/api/uploads/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds }),
      });

      if (!response.ok) {
        console.error('[DBG][useUploadNotifications] Failed to sync with server');
        return;
      }

      const { data } = await response.json();

      // Update IndexedDB with server statuses
      for (const serverVideo of data) {
        const localUpload = processingUploads.find(
          u => u.cloudflareVideoId === serverVideo.videoId
        );

        if (localUpload && serverVideo.status !== localUpload.status) {
          await updateUploadStatus(localUpload.id, serverVideo.status);
          console.log(
            '[DBG][useUploadNotifications] Updated status for:',
            localUpload.fileName,
            'to:',
            serverVideo.status
          );
        }
      }
    } catch (error) {
      console.error('[DBG][useUploadNotifications] Sync error:', error);
    }
  }, []);

  /**
   * Check for completed uploads and show notifications
   */
  const checkCompletedUploads = useCallback(async () => {
    try {
      const uploads = await getPendingUploads();

      // Get completed uploads
      const completed = uploads.filter((u: PendingUpload) => u.status === 'ready');
      const failed = uploads.filter((u: PendingUpload) => u.status === 'error');

      // Show success notifications
      for (const upload of completed) {
        showToast(`Video "${upload.fileName}" is ready!`, 'success', 5000);
        await removePendingUpload(upload.id);
        console.log('[DBG][useUploadNotifications] Notified and removed:', upload.fileName);
      }

      // Show error notifications
      for (const upload of failed) {
        const errorMsg = upload.error || 'Unknown error';
        showToast(`Video "${upload.fileName}" failed: ${errorMsg}`, 'error', 6000);
        await removePendingUpload(upload.id);
        console.log('[DBG][useUploadNotifications] Notified error and removed:', upload.fileName);
      }
    } catch (error) {
      console.error('[DBG][useUploadNotifications] Check error:', error);
    }
  }, [showToast]);

  /**
   * Initialize and set up polling
   */
  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    let pollInterval: NodeJS.Timeout;
    let syncInterval: NodeJS.Timeout;

    const init = async () => {
      try {
        // Initialize IndexedDB
        await initUploadDB();
        console.log('[DBG][useUploadNotifications] Initialized');

        // Subscribe to background uploader events
        const uploader = getBackgroundUploader();

        uploader.on('complete', async uploadId => {
          console.log('[DBG][useUploadNotifications] Upload complete event:', uploadId);
          // Status already updated in backgroundUploader, just check for notifications
          await checkCompletedUploads();
        });

        uploader.on('error', async (uploadId, data) => {
          console.log('[DBG][useUploadNotifications] Upload error event:', uploadId, data?.error);
          await checkCompletedUploads();
        });

        // Initial sync with server (for uploads completed while offline)
        if (Date.now() - lastSyncTime.current > SYNC_INTERVAL) {
          await syncWithServer();
          lastSyncTime.current = Date.now();
        }

        // Initial check for completed uploads
        await checkCompletedUploads();

        // Set up polling intervals
        pollInterval = setInterval(checkCompletedUploads, POLL_INTERVAL);
        syncInterval = setInterval(async () => {
          await syncWithServer();
          await checkCompletedUploads();
          lastSyncTime.current = Date.now();
        }, SYNC_INTERVAL);

        hasInitialized.current = true;
      } catch (error) {
        console.error('[DBG][useUploadNotifications] Init error:', error);
      }
    };

    init();

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [checkCompletedUploads, syncWithServer]);

  return null; // This hook doesn't return anything
}
