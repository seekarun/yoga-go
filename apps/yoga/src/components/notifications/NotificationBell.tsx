'use client';

import { useState, useRef, useEffect } from 'react';
import { useNotificationContextOptional } from '@/contexts/NotificationContext';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationDropdown from './NotificationDropdown';

interface NotificationBellProps {
  expertId: string | null;
  scrollOpacity?: number;
  isExpertMode?: boolean;
}

export default function NotificationBell({
  expertId,
  scrollOpacity = 1,
  isExpertMode = false,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Try to use global context first (when inside expert dashboard)
  const contextValue = useNotificationContextOptional();
  // Fall back to direct hook (when outside expert dashboard)
  const hookValue = useNotifications(contextValue ? null : expertId);

  // Use context if available, otherwise use hook
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    contextValue || hookValue;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Don't render if no expertId
  if (!expertId) {
    return null;
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: isOpen
            ? 'var(--color-primary-50, #eef2ff)'
            : scrollOpacity > 0.5
              ? '#f5f5f5'
              : isExpertMode
                ? 'rgba(255,255,255,0.15)'
                : '#f5f5f5',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          transition: 'background 0.15s ease',
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'var(--color-bg-hover, #e5e7eb)';
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.background =
              scrollOpacity > 0.5 ? '#f5f5f5' : isExpertMode ? 'rgba(255,255,255,0.15)' : '#f5f5f5';
          }
        }}
        title="Notifications"
      >
        {/* Bell Icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke={
            isOpen
              ? 'var(--color-primary, #6366f1)'
              : scrollOpacity < 0.5 && isExpertMode
                ? '#fff'
                : '#333'
          }
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            filter:
              isExpertMode && scrollOpacity < 0.5
                ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
                : 'none',
          }}
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              minWidth: '18px',
              height: '18px',
              borderRadius: '9px',
              background: 'var(--color-highlight)',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 5px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <NotificationDropdown
          notifications={notifications}
          unreadCount={unreadCount}
          isLoading={isLoading}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
