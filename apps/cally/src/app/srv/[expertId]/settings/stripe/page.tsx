"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface StripeStatus {
  connected: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  email: string | null;
  connectedAt: string | null;
}

export default function StripeSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;

  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/stripe/status");
      const data = await res.json();
      if (data.success) {
        setStatus(data.data);
      }
    } catch (error) {
      console.error("[DBG][stripe-settings] Failed to fetch status:", error);
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
      setToast("Stripe connected successfully!");
      window.history.replaceState({}, "", `/srv/${expertId}/settings/stripe`);
    }
    if (searchParams.get("pending") === "true") {
      setToast("Complete your Stripe setup to start accepting payments.");
      window.history.replaceState({}, "", `/srv/${expertId}/settings/stripe`);
    }
    const error = searchParams.get("error");
    if (error) {
      setToast(`Connection failed: ${error.replace(/_/g, " ")}`);
      window.history.replaceState({}, "", `/srv/${expertId}/settings/stripe`);
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
    window.location.href = "/api/data/app/stripe/connect";
  };

  const handleCompleteSetup = () => {
    window.location.href = "/api/data/app/stripe/refresh";
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/data/app/stripe/disconnect", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setStatus({
          connected: false,
          chargesEnabled: false,
          detailsSubmitted: false,
          email: null,
          connectedAt: null,
        });
        setToast("Stripe disconnected.");
      }
    } catch (error) {
      console.error("[DBG][stripe-settings] Failed to disconnect:", error);
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
          <h1 className="text-2xl font-bold text-[var(--text-main)]">Stripe</h1>
          <p className="text-[var(--text-muted)] mt-1">
            Accept payments from your customers.
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
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Stripe</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Accept payments from your customers.
        </p>
      </div>

      {status?.connected ? (
        <div className="space-y-4">
          {/* Onboarding incomplete warning */}
          {!status.chargesEnabled && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
                <div>
                  <p className="font-medium text-amber-800">
                    Complete your Stripe setup
                  </p>
                  <p className="text-sm text-amber-700 mt-1">
                    Your Stripe account setup is incomplete. Complete it to
                    start accepting payments.
                  </p>
                  <button
                    onClick={handleCompleteSetup}
                    className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm"
                  >
                    Complete Setup
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Connected account info */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#635BFF] flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-white"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-[var(--text-main)]">
                    Stripe Connected
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
              {status.chargesEnabled ? (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-sm text-green-600">
                    Charges enabled
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm text-amber-600">
                    Setup incomplete
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Disconnect */}
          <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
            {showDisconnectConfirm ? (
              <div>
                <p className="text-[var(--text-main)] mb-4">
                  Are you sure you want to disconnect Stripe? You will no longer
                  be able to accept payments for bookings.
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
                Disconnect Stripe
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
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z" />
          </svg>
          <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
            Stripe Payments
          </h3>
          <p className="text-[var(--text-muted)] mb-2">
            Connect your Stripe account to:
          </p>
          <ul className="text-[var(--text-muted)] text-sm mb-6 space-y-1">
            <li>Accept payments for bookings</li>
            <li>Get automatic payouts to your bank account</li>
            <li>PCI-compliant secure checkout</li>
          </ul>
          <button
            onClick={handleConnect}
            className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Connect with Stripe
          </button>
        </div>
      )}
    </div>
  );
}
