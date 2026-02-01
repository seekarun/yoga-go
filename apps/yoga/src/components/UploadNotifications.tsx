'use client';

/**
 * Upload Notifications Component
 *
 * Wrapper component that runs the useUploadNotifications hook.
 * This component renders nothing but enables background upload notifications.
 */

import { useUploadNotifications } from '@/hooks/useUploadNotifications';

export default function UploadNotifications() {
  useUploadNotifications();
  return null;
}
