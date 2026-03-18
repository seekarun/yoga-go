"use client";

import Modal, { ModalHeader, ModalFooter } from "@/components/Modal";
import { PrimaryButton, SecondaryButton } from "@/components/Button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  variant?: "danger" | "default";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isLoading = false,
  variant = "default",
}: ConfirmModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
      <ModalHeader onClose={onClose}>{title}</ModalHeader>
      <p className="text-sm text-gray-600">{message}</p>
      <ModalFooter>
        <SecondaryButton onClick={onClose} disabled={isLoading}>
          {cancelLabel}
        </SecondaryButton>
        {variant === "danger" ? (
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Deleting..." : confirmLabel}
          </button>
        ) : (
          <PrimaryButton onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Processing..." : confirmLabel}
          </PrimaryButton>
        )}
      </ModalFooter>
    </Modal>
  );
}
