'use client';

import { useEffect, useCallback, type ReactNode } from 'react';

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Modal content */
  children: ReactNode;
  /** Whether clicking the backdrop closes the modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing Escape closes the modal (default: true) */
  closeOnEscape?: boolean;
  /** Maximum width of the modal (default: 'max-w-md') */
  maxWidth?:
    | 'max-w-sm'
    | 'max-w-md'
    | 'max-w-lg'
    | 'max-w-xl'
    | 'max-w-2xl'
    | 'max-w-3xl'
    | 'max-w-4xl';
  /** Additional classes for the modal container */
  className?: string;
  /** Whether to show padding inside the modal (default: true) */
  padding?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  maxWidth = 'max-w-md',
  className = '',
  padding = true,
}: ModalProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    },
    [onClose, closeOnEscape]
  );

  // Add/remove escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = () => {
    if (closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-white/20 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal Content */}
      <div
        className={`relative bg-white rounded-xl shadow-xl w-full ${maxWidth} ${padding ? 'p-6' : ''} ${className} animate-in fade-in zoom-in-95 duration-200`}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Modal Header component for consistent styling
 */
export function ModalHeader({
  children,
  onClose,
  showCloseButton = true,
}: {
  children: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{children}</h2>
      {showCloseButton && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
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
  );
}

/**
 * Modal Footer component for action buttons
 */
export function ModalFooter({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`flex justify-end gap-3 mt-6 ${className}`}>{children}</div>;
}
