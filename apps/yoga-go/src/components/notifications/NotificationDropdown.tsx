'use client';

import type { Notification } from '@/types';
import NotificationItem from './NotificationItem';

interface NotificationDropdownProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClose: () => void;
}

export default function NotificationDropdown({
  notifications,
  unreadCount,
  isLoading,
  onMarkAsRead,
  onMarkAllAsRead,
  onClose,
}: NotificationDropdownProps) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '44px',
        right: 0,
        width: '360px',
        maxHeight: '480px',
        background: 'var(--color-surface, #ffffff)',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.12)',
        border: '1px solid var(--color-border, #e5e7eb)',
        overflow: 'hidden',
        zIndex: 1001,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderBottom: '1px solid var(--color-border, #e5e7eb)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-main, #111827)',
            }}
          >
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: '500',
                color: 'var(--color-primary, #6366f1)',
                background: 'var(--color-primary-50, #eef2ff)',
                padding: '2px 8px',
                borderRadius: '10px',
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onMarkAllAsRead}
            style={{
              fontSize: '13px',
              color: 'var(--color-primary, #6366f1)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--color-primary-50, #eef2ff)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'none';
            }}
          >
            Mark all read
          </button>
        )}
      </div>

      {/* Notification List */}
      <div
        style={{
          maxHeight: '400px',
          overflowY: 'auto',
        }}
      >
        {isLoading ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
              color: 'var(--text-muted, #6b7280)',
            }}
          >
            Loading...
          </div>
        ) : notifications.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px 20px',
              textAlign: 'center',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-muted, #9ca3af)"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span
              style={{
                fontSize: '14px',
                color: 'var(--text-muted, #6b7280)',
                marginTop: '12px',
              }}
            >
              No notifications yet
            </span>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-muted, #9ca3af)',
                marginTop: '4px',
              }}
            >
              We&apos;ll notify you when something arrives
            </span>
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={onMarkAsRead}
              onClose={onClose}
            />
          ))
        )}
      </div>
    </div>
  );
}
