'use client';

import { useEffect, useCallback } from 'react';
import { PrimaryButton, SecondaryButton } from './Button';

export interface NotificationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  duration?: number;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export default function NotificationOverlay({
  isOpen,
  onClose,
  message,
  type = 'info',
  duration,
  onConfirm,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
}: NotificationOverlayProps) {
  // Auto-close after duration (only for non-confirmation notifications)
  useEffect(() => {
    if (isOpen && duration && !onConfirm) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose, onConfirm]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const typeStyles = {
    success: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: (
        <svg
          className="w-6 h-6 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      ),
      iconBg: 'bg-green-100',
    },
    warning: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: (
        <svg
          className="w-6 h-6 text-amber-600"
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
      ),
      iconBg: 'bg-amber-100',
    },
    error: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      ),
      iconBg: 'bg-red-100',
    },
    info: {
      bg: 'bg-white',
      border: 'border-gray-200',
      icon: (
        <svg
          className="w-6 h-6 text-blue-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      iconBg: 'bg-blue-100',
    },
  };

  const styles = typeStyles[type];
  const isConfirmation = !!onConfirm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Notification Card */}
      <div
        className={`relative ${styles.bg} ${styles.border} border rounded-xl shadow-xl max-w-md w-full mx-4 p-6 animate-in fade-in zoom-in-95 duration-200`}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`${styles.iconBg} rounded-full p-2 flex-shrink-0`}>{styles.icon}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-gray-800 text-sm leading-relaxed">{message}</p>

            {/* Buttons for confirmation dialogs */}
            {isConfirmation && (
              <div className="flex gap-3 mt-4">
                <SecondaryButton onClick={onClose} className="flex-1">
                  {cancelText}
                </SecondaryButton>
                <PrimaryButton
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1"
                >
                  {confirmText}
                </PrimaryButton>
              </div>
            )}
          </div>

          {/* Close button (only for non-confirmation) */}
          {!isConfirmation && (
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
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
          )}
        </div>
      </div>
    </div>
  );
}
