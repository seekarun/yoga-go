"use client";

interface ContactConfirmationProps {
  onClose: () => void;
  warning?: string;
}

export default function ContactConfirmation({
  onClose,
  warning,
}: ContactConfirmationProps) {
  return (
    <div className="text-center py-4">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg
          className="w-7 h-7 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        Message Sent!
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Thank you for reaching out. We&apos;ll get back to you as soon as
        possible.
      </p>

      {warning && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 text-left">
          {warning}
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="w-full py-2.5 px-4 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
      >
        Close
      </button>
    </div>
  );
}
