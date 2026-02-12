"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { PRICING_TIERS } from "@/lib/pricing";
import type {
  SubscriptionConfig,
  SubscriptionTier,
} from "@/types/subscription";

interface SubscriptionStatusData {
  hasSubscription: boolean;
  customerId?: string;
  subscriptionId?: string;
  tier?: SubscriptionTier;
  status?: SubscriptionConfig["status"];
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  cancelAtPeriodEnd?: boolean;
  subscribedAt?: string;
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trialing: "bg-blue-100 text-blue-700",
    past_due: "bg-yellow-100 text-yellow-700",
    canceled: "bg-red-100 text-red-700",
    unpaid: "bg-red-100 text-red-700",
    incomplete: "bg-gray-100 text-gray-600",
    paused: "bg-gray-100 text-gray-600",
  };
  const classes = colorMap[status] || "bg-gray-100 text-gray-600";

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${classes}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SubscriptionSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;

  const [data, setData] = useState<SubscriptionStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/data/app/subscription/status");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (err) {
      console.error("[DBG][subscription] Failed to fetch status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    if (searchParams.get("subscribed") === "true") {
      setShowSuccess(true);
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/data/app/subscription/portal", {
        method: "POST",
      });
      const json = await res.json();
      if (json.success && json.data.portalUrl) {
        window.location.href = json.data.portalUrl;
      }
    } catch (err) {
      console.error("[DBG][subscription] Failed to open portal:", err);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleSelectPlan = (tier: SubscriptionTier) => {
    window.location.href = `/api/data/app/subscription/checkout-redirect?tier=${tier}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  const isActive =
    data?.hasSubscription &&
    (data.status === "active" || data.status === "trialing");
  const isCanceledOrPastDue =
    data?.hasSubscription &&
    (data.status === "canceled" || data.status === "past_due");
  const currentTier = data?.tier
    ? PRICING_TIERS.find((t) => t.tier === data.tier)
    : null;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Subscription & Billing
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your CallyGo subscription plan and billing.
        </p>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          Your subscription has been activated successfully!
        </div>
      )}

      {/* Active or trialing subscription */}
      {isActive && currentTier && (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)]">
                {currentTier.name} Plan
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                ${currentTier.price}/month
              </p>
            </div>
            <StatusBadge status={data.status!} />
          </div>

          <div className="space-y-3 text-sm">
            {data.status === "trialing" && data.trialEnd && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Trial ends</span>
                <span className="text-[var(--text-main)] font-medium">
                  {formatDate(data.trialEnd)}
                </span>
              </div>
            )}
            {data.currentPeriodEnd && (
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">
                  {data.status === "trialing"
                    ? "First billing date"
                    : "Next billing date"}
                </span>
                <span className="text-[var(--text-main)] font-medium">
                  {formatDate(data.currentPeriodEnd)}
                </span>
              </div>
            )}
            {data.cancelAtPeriodEnd && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 text-sm">
                Your subscription will cancel at the end of the current billing
                period.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-sm disabled:opacity-50"
            >
              {portalLoading ? "Opening..." : "Manage Billing"}
            </button>
          </div>
        </div>
      )}

      {/* Canceled or past due */}
      {isCanceledOrPastDue && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <StatusBadge status={data.status!} />
            <span className="text-sm font-medium text-red-700">
              {data.status === "canceled"
                ? "Your subscription has been canceled."
                : "Your payment is past due."}
            </span>
          </div>
          <p className="text-sm text-red-600">
            {data.status === "canceled"
              ? "Choose a plan below to resubscribe."
              : "Please update your payment method to continue."}
          </p>
          {data.status === "past_due" && data.customerId && (
            <button
              onClick={handleManageBilling}
              disabled={portalLoading}
              className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-50"
            >
              {portalLoading ? "Opening..." : "Update Payment Method"}
            </button>
          )}
        </div>
      )}

      {/* Show pricing tiers if no active subscription */}
      {(!data?.hasSubscription || isCanceledOrPastDue) && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
            {isCanceledOrPastDue ? "Choose a Plan" : "Select a Plan"}
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.tier}
                className={`rounded-xl p-6 flex flex-col ${
                  tier.highlighted
                    ? "bg-[var(--color-primary)] text-white shadow-lg"
                    : "bg-white border border-[var(--color-border)]"
                }`}
              >
                <h3
                  className={`text-lg font-semibold mb-1 ${
                    tier.highlighted ? "text-white" : "text-[var(--text-main)]"
                  }`}
                >
                  {tier.name}
                </h3>
                <p
                  className={`text-sm mb-3 ${
                    tier.highlighted
                      ? "text-white/70"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  {tier.description}
                </p>
                <div className="mb-1">
                  <span
                    className={`text-3xl font-bold ${
                      tier.highlighted
                        ? "text-white"
                        : "text-[var(--text-main)]"
                    }`}
                  >
                    ${tier.price}
                  </span>
                  <span
                    className={`text-sm ${
                      tier.highlighted
                        ? "text-white/70"
                        : "text-[var(--text-muted)]"
                    }`}
                  >
                    /month
                  </span>
                </div>
                <p className="text-sm font-medium text-[var(--color-highlight)] mb-4">
                  {tier.trialLabel}
                </p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tier.features.map((feature) => (
                    <li
                      key={feature}
                      className={`flex items-start gap-2 text-sm ${
                        tier.highlighted
                          ? "text-white/90"
                          : "text-[var(--text-body)]"
                      }`}
                    >
                      <svg
                        className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-highlight)]"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12.75l6 6 9-13.5"
                        />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(tier.tier)}
                  className={`w-full py-2.5 px-4 rounded-lg font-medium transition-all text-sm ${
                    tier.highlighted
                      ? "bg-white text-[var(--color-primary)] hover:bg-white/90"
                      : "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]"
                  }`}
                >
                  Subscribe
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Current plan features (when active) */}
      {isActive && currentTier && (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
            Your Plan Features
          </h2>
          <ul className="grid sm:grid-cols-2 gap-2">
            {currentTier.features.map((feature) => (
              <li
                key={feature}
                className="flex items-start gap-2 text-sm text-[var(--text-body)]"
              >
                <svg
                  className="w-4 h-4 mt-0.5 shrink-0 text-[var(--color-highlight)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Back link */}
      <div className="mt-6">
        <a
          href={`/srv/${expertId}/settings`}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          Back to Settings
        </a>
      </div>
    </div>
  );
}
