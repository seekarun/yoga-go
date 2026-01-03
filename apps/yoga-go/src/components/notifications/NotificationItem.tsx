'use client';

import { useRouter } from 'next/navigation';
import type { Notification } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => Promise<void>;
  onClose: () => void;
}

// Get icon for notification type
function getNotificationIcon(type: string): string {
  switch (type) {
    case 'email_received':
      return 'M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z';
    case 'forum_comment':
    case 'forum_reply':
      return 'M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z';
    case 'payment_received':
      return 'M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z';
    case 'new_signup':
      return 'M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z';
    case 'course_enrollment':
      return 'M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z';
    default:
      return 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z';
  }
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onClose,
}: NotificationItemProps) {
  const router = useRouter();

  // Get the correct navigation link - handles both old and new notification formats
  const getNavigationLink = (): string | null => {
    // For email notifications, ensure we link to the specific email
    if (notification.type === 'email_received') {
      // Check if metadata contains emailId (for both old and new formats)
      const metadata = notification.metadata as { emailId?: string } | undefined;
      if (metadata?.emailId) {
        // Extract expertId from the link or recipientId
        const linkMatch = notification.link?.match(/\/srv\/([^/]+)\/inbox/);
        const expertId = linkMatch?.[1] || notification.recipientId;
        if (expertId) {
          return `/srv/${expertId}/inbox/${metadata.emailId}`;
        }
      }
    }
    // Fall back to the stored link for other notification types
    return notification.link || null;
  };

  const handleClick = async () => {
    console.log(
      '[DBG][NotificationItem] Click - notification:',
      notification.id,
      'isRead:',
      notification.isRead
    );

    // Mark as read first and wait for it to complete
    if (!notification.isRead) {
      console.log('[DBG][NotificationItem] Marking as read...');
      await onMarkAsRead(notification.id);
      console.log('[DBG][NotificationItem] Mark as read complete');
    }

    // Close the dropdown
    onClose();

    // Navigate to the correct link
    const link = getNavigationLink();
    console.log('[DBG][NotificationItem] Navigating to:', link);
    if (link) {
      router.push(link);
    }
  };

  const content = (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '12px 16px',
        background: notification.isRead ? 'transparent' : 'var(--color-bg-subtle, #f9fafb)',
        borderBottom: '1px solid var(--color-border, #e5e7eb)',
        cursor: 'pointer',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--color-bg-hover, #f3f4f6)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = notification.isRead
          ? 'transparent'
          : 'var(--color-bg-subtle, #f9fafb)';
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: 'var(--color-primary-50, #eef2ff)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="var(--color-primary, #6366f1)">
          <path d={getNotificationIcon(notification.type)} />
        </svg>
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: notification.isRead ? '400' : '500',
            color: 'var(--text-main, #111827)',
            marginBottom: '2px',
          }}
        >
          {notification.title}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--text-muted, #6b7280)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {notification.message}
        </div>
        <div
          style={{
            fontSize: '12px',
            color: 'var(--text-muted, #9ca3af)',
            marginTop: '4px',
          }}
        >
          {formatRelativeTime(notification.createdAt || '')}
        </div>
      </div>

      {/* Unread indicator */}
      {!notification.isRead && (
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: 'var(--color-primary, #6366f1)',
            flexShrink: 0,
            marginTop: '4px',
          }}
        />
      )}
    </div>
  );

  return <div onClick={handleClick}>{content}</div>;
}
