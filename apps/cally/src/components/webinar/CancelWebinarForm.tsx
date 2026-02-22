"use client";

import { useState, useEffect, useCallback } from "react";

interface WebinarCancelPreview {
  productId: string;
  webinarName: string;
  sessions: { date: string; startTime: string; endTime: string }[];
  visitorName: string;
  visitorEmail: string;
  isPaid: boolean;
  paidAmountCents: number;
  refundAmountCents: number;
  isFullRefund: boolean;
  refundReason: string;
  currency: string;
  cancellationDeadlineHours: number;
  isBeforeDeadline: boolean;
}

interface CancelWebinarFormProps {
  tenantId: string;
  token: string;
}

function formatCurrency(amountCents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatSessionDateTime(
  _date: string,
  startTime: string,
  endTime: string,
): string {
  const d = new Date(startTime);
  const dateStr = d.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const start = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  const e = new Date(endTime);
  const end = e.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr}, ${start} - ${end}`;
}

/**
 * Extract productId from the cancel token payload (base64-encoded JSON before the dot).
 * The server still validates the full token signature; this is just for building the URL.
 */
function extractProductIdFromToken(token: string): string | null {
  try {
    const [encoded] = token.split(".");
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload.productId || null;
  } catch {
    return null;
  }
}

export default function CancelWebinarForm({
  tenantId,
  token,
}: CancelWebinarFormProps) {
  const [preview, setPreview] = useState<WebinarCancelPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelResult, setCancelResult] = useState<{
    refundAmountCents: number;
  } | null>(null);

  const productId = extractProductIdFromToken(token);

  const fetchPreview = useCallback(async () => {
    if (!productId) {
      setError("Invalid cancel token — unable to determine webinar");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(
        `/api/data/tenants/${tenantId}/webinar/${productId}/cancel?token=${encodeURIComponent(token)}`,
      );
      const data = await res.json();
      if (data.success) {
        setPreview(data.data);
      } else {
        setError(data.error || "Failed to load webinar details");
      }
    } catch {
      setError("Failed to load webinar details");
    } finally {
      setLoading(false);
    }
  }, [tenantId, token, productId]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  const handleCancel = async () => {
    if (!productId) return;

    setCancelling(true);
    setError("");

    try {
      const res = await fetch(
        `/api/data/tenants/${tenantId}/webinar/${productId}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setCancelled(true);
        setCancelResult({
          refundAmountCents: data.data.refundAmountCents,
        });
      } else {
        setError(data.error || "Failed to cancel registration");
      }
    } catch {
      setError("Failed to cancel registration");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4" />
          <p className="text-gray-600">Loading webinar details...</p>
        </div>
      </div>
    );
  }

  if (error && !preview) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Unable to Cancel
          </h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (cancelled && cancelResult) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            Registration Cancelled
          </h1>
          <p className="text-gray-600 mb-4">
            Your webinar registration has been successfully cancelled.
          </p>
          {cancelResult.refundAmountCents > 0 && preview && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-left">
              <p className="text-sm font-medium text-green-800">
                Refund of{" "}
                {formatCurrency(
                  cancelResult.refundAmountCents,
                  preview.currency,
                )}{" "}
                will be processed to your original payment method (5-10 business
                days).
              </p>
            </div>
          )}
          {cancelResult.refundAmountCents === 0 && preview?.isPaid && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
              <p className="text-sm text-yellow-800">
                No refund is applicable for this cancellation per the
                cancellation policy.
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500 mt-4">
            A confirmation email has been sent to your email address.
          </p>
        </div>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          Cancel Registration
        </h1>
        <p className="text-gray-600 mb-6">
          Are you sure you want to cancel your registration for this webinar?
        </p>

        {/* Webinar details */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Webinar Details
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Webinar</span>
              <span className="text-gray-900 font-medium text-right">
                {preview.webinarName}
              </span>
            </div>
            {preview.visitorName && (
              <div className="flex justify-between">
                <span className="text-gray-500">Name</span>
                <span className="text-gray-900">{preview.visitorName}</span>
              </div>
            )}
          </div>

          {/* Sessions list */}
          {preview.sessions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Sessions
              </span>
              <ul className="mt-2 space-y-1">
                {preview.sessions.map((session, idx) => (
                  <li key={session.date} className="text-sm text-gray-900">
                    <span className="text-gray-500 mr-1">{idx + 1}.</span>
                    {formatSessionDateTime(
                      session.date,
                      session.startTime,
                      session.endTime,
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Refund info */}
        {preview.isPaid && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Cancellation Policy
            </h3>
            {preview.isBeforeDeadline ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 font-medium">
                  Full refund of{" "}
                  {formatCurrency(preview.paidAmountCents, preview.currency)}
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {preview.refundReason}
                </p>
              </div>
            ) : preview.refundAmountCents > 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Partial refund of{" "}
                  {formatCurrency(preview.refundAmountCents, preview.currency)}{" "}
                  (of{" "}
                  {formatCurrency(preview.paidAmountCents, preview.currency)}{" "}
                  paid)
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  {preview.refundReason}
                </p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800 font-medium">
                  No refund applicable
                </p>
                <p className="text-xs text-red-700 mt-1">
                  {preview.refundReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={cancelling}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {cancelling ? "Cancelling..." : "Confirm Cancellation"}
          </button>
        </div>
      </div>
    </div>
  );
}
