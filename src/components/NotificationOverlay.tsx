'use client';

import { useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: NotificationType;
  duration?: number; // Auto-close duration in ms (0 = no auto-close)
}

export default function NotificationOverlay({
  isOpen,
  onClose,
  message,
  type = 'info',
  duration = 3000,
}: NotificationOverlayProps) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: '✓',
          iconBg: 'bg-green-100',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: '⚠️',
          iconBg: 'bg-red-100',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: '⚠',
          iconBg: 'bg-yellow-100',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'ℹ️',
          iconBg: 'bg-blue-100',
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-50 transition-opacity duration-300"
        onClick={onClose}
        style={{
          animation: 'fadeIn 0.3s ease-out',
        }}
      />

      {/* Notification Card */}
      <div
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 max-w-md w-full mx-4"
        style={{
          animation: 'slideDown 0.3s ease-out',
        }}
      >
        <div
          className={`${styles.bg} ${styles.border} border rounded-lg shadow-lg p-6 relative`}
          role="alert"
          aria-live="assertive"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close notification"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Content */}
          <div className="flex items-start gap-4 pr-8">
            <div
              className={`${styles.iconBg} rounded-full p-2 flex-shrink-0 flex items-center justify-center w-10 h-10`}
            >
              <span className="text-xl">{styles.icon}</span>
            </div>
            <div className="flex-1">
              <p className={`${styles.text} text-base font-medium leading-relaxed`}>{message}</p>
            </div>
          </div>

          {/* Progress bar for auto-close */}
          {duration > 0 && (
            <div className="mt-4 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  animation: `shrink ${duration}ms linear`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translate(-50%, -60%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        @keyframes shrink {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </>
  );
}
