"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface GoogleBusinessStatus {
  connected: boolean;
  email: string | null;
  locationName: string | null;
  connectedAt: string | null;
}

export default function GoogleBusinessSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;

  const [status, setStatus] = useState<GoogleBusinessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/google-business/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error(
        "[DBG][google-business-settings] Failed to fetch status:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Show toast on successful connection
  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      setToast("Google Business Profile connected successfully!");
      window.history.replaceState(
        {},
        "",
        `/srv/${expertId}/settings/google-business`,
      );
    }
    const error = searchParams.get("error");
    if (error) {
      setToast(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState(
        {},
        "",
        `/srv/${expertId}/settings/google-business`,
      );
    }
  }, [searchParams, expertId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleConnect = () => {
    window.location.href = "/api/data/app/google-business/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/data/app/google-business/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setStatus({
          connected: false,
          email: null,
          locationName: null,
          connectedAt: null,
        });
        setToast("Google Business Profile disconnected.");
      }
    } catch (error) {
      console.error(
        "[DBG][google-business-settings] Failed to disconnect:",
        error,
      );
      setToast("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <Link
            href={`/srv/${expertId}/settings`}
            className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors mb-3"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            Back to Integrations
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Google Business Profile
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            View and reply to your Google Reviews.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-[var(--text-main)] text-white px-4 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <div className="mb-8">
        <Link
          href={`/srv/${expertId}/settings`}
          className="inline-flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors mb-3"
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5 8.25 12l7.5-7.5"
            />
          </svg>
          Back to Integrations
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Google Business Profile
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          View and reply to your Google Reviews.
        </p>
      </div>

      {status?.connected ? (
        <div className="space-y-4">
          {/* Connected account info */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#4285F4] flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-main)]">
                    Google Business Profile Connected
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {status.email}
                  </p>
                  {status.locationName && (
                    <p className="text-sm text-[var(--text-muted)]">
                      {status.locationName}
                    </p>
                  )}
                  {status.connectedAt && (
                    <p className="text-xs text-[var(--text-muted)]">
                      Connected{" "}
                      {new Date(status.connectedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
              <div
                className="w-3 h-3 rounded-full bg-green-500"
                title="Connected"
              />
            </div>
          </div>

          {/* Disconnect */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            {showDisconnectConfirm ? (
              <div>
                <p className="text-[var(--text-main)] mb-4">
                  Are you sure you want to disconnect Google Business Profile?
                  You will no longer be able to view or reply to Google Reviews
                  from CallyGo.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDisconnectConfirm(false)}
                    disabled={disconnecting}
                    className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Disconnect Google Business Profile
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
          <svg
            className="w-12 h-12 mx-auto mb-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            style={{ color: "var(--text-muted)" }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
            />
          </svg>
          <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
            Google Business Profile Integration
          </h3>
          <p className="text-[var(--text-muted)] mb-2">
            Connect your Google Business Profile to:
          </p>
          <ul className="text-[var(--text-muted)] text-sm mb-6 space-y-1">
            <li>View your Google Reviews directly in CallyGo</li>
            <li>Reply to customer reviews without leaving the dashboard</li>
            <li>See your average rating and total review count</li>
          </ul>
          <button
            type="button"
            onClick={handleConnect}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Connect Google Business Profile
          </button>
        </div>
      )}
    </div>
  );
}
