"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface ZoomStatus {
  connected: boolean;
  email: string | null;
  connectedAt: string | null;
}

export default function ZoomSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;

  const [status, setStatus] = useState<ZoomStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/zoom/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("[DBG][zoom-settings] Failed to fetch status:", error);
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
      setToast("Zoom connected successfully!");
      window.history.replaceState({}, "", `/srv/${expertId}/settings/zoom`);
    }
    const error = searchParams.get("error");
    if (error) {
      setToast(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", `/srv/${expertId}/settings/zoom`);
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
    window.location.href = "/api/data/app/zoom/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/data/app/zoom/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setStatus({ connected: false, email: null, connectedAt: null });
        setToast("Zoom disconnected.");
      }
    } catch (error) {
      console.error("[DBG][zoom-settings] Failed to disconnect:", error);
      setToast("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  const backLink = (
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
  );

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          {backLink}
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Zoom</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Connect your Zoom account to create meetings automatically.
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
        {backLink}
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Zoom</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Connect your Zoom account to create meetings automatically.
        </p>
      </div>

      {status?.connected ? (
        <div className="space-y-4">
          {/* Connected account info */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D8CFF] flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M4.585 4.585C2.264 4.585.38 6.468.38 8.79v6.42c0 2.322 1.884 4.205 4.205 4.205h10.05c.348 0 .63-.282.63-.63v-6.42c0-.348-.282-.63-.63-.63H8.79a.63.63 0 0 1-.63-.63V8.79c0-.348.282-.63.63-.63h6.42c.348 0 .63-.282.63-.63V4.585c0-.348-.282-.63-.63-.63H4.585zm14.63 5.04v4.16l3.785 2.84V6.785l-3.785 2.84z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-main)]">
                    Zoom Connected
                  </p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {status.email}
                  </p>
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
                  Are you sure you want to disconnect Zoom? Future events will
                  no longer generate Zoom meeting links.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
                  </button>
                  <button
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
                onClick={() => setShowDisconnectConfirm(true)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Disconnect Zoom
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
            <path d="M4.585 4.585C2.264 4.585.38 6.468.38 8.79v6.42c0 2.322 1.884 4.205 4.205 4.205h10.05c.348 0 .63-.282.63-.63v-6.42c0-.348-.282-.63-.63-.63H8.79a.63.63 0 0 1-.63-.63V8.79c0-.348.282-.63.63-.63h6.42c.348 0 .63-.282.63-.63V4.585c0-.348-.282-.63-.63-.63H4.585zm14.63 5.04v4.16l3.785 2.84V6.785l-3.785 2.84z" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
            Zoom Integration
          </h3>
          <p className="text-[var(--text-muted)] mb-2">
            Connect your Zoom account to:
          </p>
          <ul className="text-[var(--text-muted)] text-sm mb-6 space-y-1">
            <li>Automatically create Zoom meetings for new events</li>
            <li>Share Zoom join links with your clients</li>
          </ul>
          <button
            onClick={handleConnect}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Connect Zoom
          </button>
        </div>
      )}
    </div>
  );
}
