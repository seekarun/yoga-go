"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface OutlookCalendarStatus {
  connected: boolean;
  email: string | null;
  blockBookingSlots: boolean;
  pushEvents: boolean;
  connectedAt: string | null;
}

export default function OutlookSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;

  const [status, setStatus] = useState<OutlookCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/data/app/outlook-calendar/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        const { synced, failed, alreadySynced } = data.data;
        const parts = [];
        if (synced > 0) parts.push(`${synced} events pushed to Outlook`);
        if (alreadySynced > 0) parts.push(`${alreadySynced} already synced`);
        if (failed > 0) parts.push(`${failed} failed`);
        setToast(parts.join(", ") || "No events to sync.");
      } else {
        setToast("Sync failed. Please try again.");
      }
    } catch (error) {
      console.error("[DBG][outlook-settings] Sync failed:", error);
      setToast("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/outlook-calendar/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("[DBG][outlook-settings] Failed to fetch status:", error);
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
      setToast("Outlook Calendar connected successfully!");
      window.history.replaceState({}, "", `/srv/${expertId}/settings/outlook`);
    }
    const error = searchParams.get("error");
    if (error) {
      setToast(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", `/srv/${expertId}/settings/outlook`);
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
    window.location.href = "/api/data/app/outlook-calendar/connect";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/data/app/outlook-calendar/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setStatus({
          connected: false,
          email: null,
          blockBookingSlots: true,
          pushEvents: true,
          connectedAt: null,
        });
        setToast("Outlook Calendar disconnected.");
      }
    } catch (error) {
      console.error("[DBG][outlook-settings] Failed to disconnect:", error);
      setToast("Failed to disconnect. Please try again.");
    } finally {
      setDisconnecting(false);
      setShowDisconnectConfirm(false);
    }
  };

  const handleToggleBlockSlots = async (checked: boolean) => {
    try {
      const res = await fetch("/api/data/app/outlook-calendar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockBookingSlots: checked }),
      });
      const data = await res.json();
      if (data.success && status) {
        setStatus({ ...status, blockBookingSlots: checked });
      }
    } catch (error) {
      console.error(
        "[DBG][outlook-settings] Failed to update settings:",
        error,
      );
    }
  };

  const handleTogglePushEvents = async (checked: boolean) => {
    try {
      const res = await fetch("/api/data/app/outlook-calendar/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pushEvents: checked }),
      });
      const data = await res.json();
      if (data.success && status) {
        setStatus({ ...status, pushEvents: checked });
      }
    } catch (error) {
      console.error(
        "[DBG][outlook-settings] Failed to update settings:",
        error,
      );
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
          <h1 className="text-2xl font-bold text-[var(--text-main)]">
            Outlook Calendar
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Connect your Outlook Calendar to sync events.
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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Outlook Calendar
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Connect your Outlook Calendar to sync events.
        </p>
      </div>

      {status?.connected ? (
        <ConnectedState
          status={status}
          disconnecting={disconnecting}
          showDisconnectConfirm={showDisconnectConfirm}
          syncing={syncing}
          onToggleBlockSlots={handleToggleBlockSlots}
          onTogglePushEvents={handleTogglePushEvents}
          onSync={handleSync}
          onDisconnectClick={() => setShowDisconnectConfirm(true)}
          onDisconnectConfirm={handleDisconnect}
          onDisconnectCancel={() => setShowDisconnectConfirm(false)}
        />
      ) : (
        <DisconnectedState onConnect={handleConnect} />
      )}
    </div>
  );
}

function DisconnectedState({ onConnect }: { onConnect: () => void }) {
  return (
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
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
        />
      </svg>
      <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
        Outlook Calendar Integration
      </h3>
      <p className="text-[var(--text-muted)] mb-2">
        Connect your Microsoft Outlook Calendar to:
      </p>
      <ul className="text-[var(--text-muted)] text-sm mb-6 space-y-1">
        <li>Automatically sync CallyGo events to your Outlook Calendar</li>
        <li>Block booking slots when you&apos;re busy on Outlook Calendar</li>
      </ul>
      <button
        onClick={onConnect}
        className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
      >
        Connect Outlook Calendar
      </button>
    </div>
  );
}

function ConnectedState({
  status,
  disconnecting,
  showDisconnectConfirm,
  syncing,
  onToggleBlockSlots,
  onTogglePushEvents,
  onSync,
  onDisconnectClick,
  onDisconnectConfirm,
  onDisconnectCancel,
}: {
  status: OutlookCalendarStatus;
  disconnecting: boolean;
  showDisconnectConfirm: boolean;
  syncing: boolean;
  onToggleBlockSlots: (checked: boolean) => void;
  onTogglePushEvents: (checked: boolean) => void;
  onSync: () => void;
  onDisconnectClick: () => void;
  onDisconnectConfirm: () => void;
  onDisconnectCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Connected account info */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0078D4] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M19.5 3h-3V1.5h-1.5V3h-6V1.5H7.5V3h-3C3.675 3 3 3.675 3 4.5v15c0 .825.675 1.5 1.5 1.5h15c.825 0 1.5-.675 1.5-1.5v-15c0-.825-.675-1.5-1.5-1.5zm0 16.5h-15V7.5h15v12z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-[var(--text-main)]">
                Outlook Calendar Connected
              </p>
              <p className="text-sm text-[var(--text-muted)]">{status.email}</p>
              {status.connectedAt && (
                <p className="text-xs text-[var(--text-muted)]">
                  Connected {new Date(status.connectedAt).toLocaleDateString()}
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

      {/* Settings */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-4">
          Settings
        </h3>

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium text-[var(--text-main)]">
              Block booking slots
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              When enabled, time slots that conflict with your Outlook Calendar
              events will be unavailable for booking.
            </p>
          </div>
          <div className="ml-4 relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={status.blockBookingSlots}
              onChange={(e) => onToggleBlockSlots(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[var(--color-primary)] transition-colors" />
            <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>

        <hr className="my-4 border-[var(--color-border)]" />

        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-medium text-[var(--text-main)]">
              Push CallyGo events to Outlook Calendar
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              When enabled, events created in CallyGo are automatically pushed
              to your Outlook Calendar. When disabled, CallyGo only reads events
              from Outlook Calendar.
            </p>
          </div>
          <div className="ml-4 relative">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={status.pushEvents}
              onChange={(e) => onTogglePushEvents(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-[var(--color-primary)] transition-colors" />
            <div className="absolute left-[2px] top-[2px] bg-white w-5 h-5 rounded-full transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>

      {/* Sync existing events */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          Sync Existing Events
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Push all existing CallyGo events to Outlook Calendar. Events already
          synced will be skipped.
        </p>
        <button
          onClick={onSync}
          disabled={syncing}
          className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors disabled:opacity-50"
        >
          {syncing ? "Syncing..." : "Sync now"}
        </button>
      </div>

      {/* Disconnect */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
        {showDisconnectConfirm ? (
          <div>
            <p className="text-[var(--text-main)] mb-4">
              Are you sure you want to disconnect Outlook Calendar? Existing
              synced events in Outlook Calendar will remain, but future changes
              won&apos;t be synced.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onDisconnectConfirm}
                disabled={disconnecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Yes, disconnect"}
              </button>
              <button
                onClick={onDisconnectCancel}
                disabled={disconnecting}
                className="px-4 py-2 border border-[var(--color-border)] rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={onDisconnectClick}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Disconnect Outlook Calendar
          </button>
        )}
      </div>
    </div>
  );
}
