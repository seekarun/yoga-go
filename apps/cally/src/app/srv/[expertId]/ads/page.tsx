"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import type {
  AdCampaign,
  AdCredit,
  AdGoal,
  AdPlatform,
  AdBundleId,
} from "@/types";
import CampaignStatusBadge from "@/components/ads/CampaignStatusBadge";
import AdBundlePicker from "@/components/ads/AdBundlePicker";
import AdCreativePreview from "@/components/ads/AdCreativePreview";

type View = "list" | "create";
type CreateStep = "goal" | "platform" | "budget" | "generating" | "review";

export default function AdsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const expertId = params.expertId as string;

  const [view, setView] = useState<View>("list");
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [credit, setCredit] = useState<AdCredit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create campaign flow state
  const [createStep, setCreateStep] = useState<CreateStep>("goal");
  const [selectedGoal, setSelectedGoal] = useState<AdGoal | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<AdPlatform | null>(
    null,
  );
  const [selectedBundle, setSelectedBundle] = useState<AdBundleId | null>(null);
  const [newCampaign, setNewCampaign] = useState<AdCampaign | null>(null);
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState(false);

  const purchaseStatus = searchParams.get("purchase");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsRes, balanceRes] = await Promise.all([
        fetch("/api/data/app/ads/campaigns"),
        fetch("/api/data/app/ads/balance"),
      ]);

      const campaignsJson = await campaignsRes.json();
      const balanceJson = await balanceRes.json();

      if (campaignsJson.success) setCampaigns(campaignsJson.data);
      if (balanceJson.success) setCredit(balanceJson.data.credit);
    } catch {
      setError("Failed to load ads data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async () => {
    if (!selectedGoal || !selectedPlatform || !selectedBundle) return;

    setCreating(true);
    setCreateStep("generating");

    try {
      const res = await fetch("/api/data/app/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: selectedGoal,
          platform: selectedPlatform,
          bundleId: selectedBundle,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setNewCampaign(json.data);
        setCreateStep("review");
      } else {
        setError(json.error || "Failed to create campaign");
        setCreateStep("budget");
      }
    } catch {
      setError("Failed to create campaign");
      setCreateStep("budget");
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (campaignId: string) => {
    setApproving(true);
    try {
      const res = await fetch(
        `/api/data/app/ads/campaigns/${campaignId}/approve`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json.success) {
        await fetchData();
        setView("list");
        resetCreateFlow();
      } else {
        setError(json.error || "Failed to approve campaign");
      }
    } catch {
      setError("Failed to approve campaign");
    } finally {
      setApproving(false);
    }
  };

  const handleRegenerate = async (campaignId: string) => {
    setCreating(true);
    try {
      const res = await fetch(
        `/api/data/app/ads/campaigns/${campaignId}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );
      const json = await res.json();
      if (json.success) {
        setNewCampaign(json.data);
      } else {
        setError(json.error || "Failed to regenerate");
      }
    } catch {
      setError("Failed to regenerate");
    } finally {
      setCreating(false);
    }
  };

  const handlePurchase = async (bundleId: AdBundleId) => {
    try {
      const res = await fetch("/api/data/app/ads/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bundleId }),
      });
      const json = await res.json();
      if (json.success) {
        window.location.href = json.data.checkoutUrl;
      } else {
        setError(json.error || "Failed to start purchase");
      }
    } catch {
      setError("Failed to start purchase");
    }
  };

  const resetCreateFlow = () => {
    setCreateStep("goal");
    setSelectedGoal(null);
    setSelectedPlatform(null);
    setSelectedBundle(null);
    setNewCampaign(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Ad Campaigns
        </h1>
        {view === "list" && (
          <button
            onClick={() => setView("create")}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Create Campaign
          </button>
        )}
        {view === "create" && (
          <button
            onClick={() => {
              setView("list");
              resetCreateFlow();
            }}
            className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--text-main)] hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>

      {purchaseStatus === "success" && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200">
          Ad credits purchased successfully!
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)]">
              Ad Credit Balance
            </p>
            <p className="text-3xl font-bold text-[var(--text-main)]">
              ${((credit?.balanceCents ?? 0) / 100).toFixed(2)}
            </p>
          </div>
          <div className="flex gap-2">
            {(["bundle_50", "bundle_100", "bundle_200"] as AdBundleId[]).map(
              (id) => (
                <button
                  key={id}
                  onClick={() => handlePurchase(id)}
                  className="px-3 py-1.5 text-sm border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-blue-50 transition-colors"
                >
                  Buy $
                  {id === "bundle_50" ? 50 : id === "bundle_100" ? 100 : 200}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* CREATE FLOW */}
      {view === "create" && (
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6">
          {/* Step: Goal */}
          {createStep === "goal" && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
                What is your campaign goal?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setSelectedGoal("traffic");
                    setCreateStep("platform");
                  }}
                  className="p-4 border-2 border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] text-left transition-all"
                >
                  <p className="font-semibold text-[var(--text-main)]">
                    Drive Traffic
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Send visitors to your landing page
                  </p>
                </button>
                <button
                  onClick={() => {
                    setSelectedGoal("lead_generation");
                    setCreateStep("platform");
                  }}
                  className="p-4 border-2 border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] text-left transition-all"
                >
                  <p className="font-semibold text-[var(--text-main)]">
                    Get Leads
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Collect contact info from potential clients
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step: Platform */}
          {createStep === "platform" && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
                Where do you want to advertise?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(
                  [
                    { id: "facebook", label: "Facebook" },
                    { id: "instagram", label: "Instagram" },
                    { id: "both", label: "Both" },
                  ] as { id: AdPlatform; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPlatform(p.id);
                      setCreateStep("budget");
                    }}
                    className="p-4 border-2 border-[var(--color-border)] rounded-lg hover:border-[var(--color-primary)] text-center transition-all"
                  >
                    <p className="font-semibold text-[var(--text-main)]">
                      {p.label}
                    </p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCreateStep("goal")}
                className="mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]"
              >
                Back
              </button>
            </div>
          )}

          {/* Step: Budget */}
          {createStep === "budget" && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
                Choose your ad budget
              </h2>
              <AdBundlePicker
                selected={selectedBundle}
                onSelect={setSelectedBundle}
              />
              <div className="flex items-center gap-3 mt-6">
                <button
                  onClick={() => setCreateStep("platform")}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--text-main)] hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateCampaign}
                  disabled={!selectedBundle || creating}
                  className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {creating ? "Generating..." : "Generate Campaign"}
                </button>
              </div>
            </div>
          )}

          {/* Step: Generating */}
          {createStep === "generating" && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4" />
              <p className="text-lg font-medium text-[var(--text-main)]">
                AI is crafting your campaign...
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-2">
                Generating targeting, creative copy, and ad preview
              </p>
            </div>
          )}

          {/* Step: Review */}
          {createStep === "review" && newCampaign && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
                Review Your Campaign
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Campaign Details */}
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">
                      Campaign Name
                    </p>
                    <p className="text-[var(--text-main)]">
                      {newCampaign.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">
                      Headline
                    </p>
                    <p className="text-[var(--text-main)]">
                      {newCampaign.creative.headline}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">
                      Primary Text
                    </p>
                    <p className="text-[var(--text-main)]">
                      {newCampaign.creative.primaryText}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">
                      Targeting
                    </p>
                    <div className="text-sm text-[var(--text-main)]">
                      <p>
                        Ages: {newCampaign.targeting.ageMin}-
                        {newCampaign.targeting.ageMax}
                      </p>
                      <p>
                        Locations:{" "}
                        {newCampaign.targeting.locations
                          .map((l) => l.name)
                          .join(", ") || "Broad"}
                      </p>
                      <p>
                        Interests:{" "}
                        {newCampaign.targeting.interests
                          .map((i) => i.name)
                          .join(", ") || "None"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-muted)]">
                      Budget
                    </p>
                    <p className="text-[var(--text-main)]">
                      ${(newCampaign.budgetCents / 100).toFixed(2)} ad spend
                    </p>
                  </div>
                </div>

                {/* Ad Preview */}
                <div>
                  <p className="text-sm font-medium text-[var(--text-muted)] mb-2">
                    Ad Preview
                  </p>
                  <AdCreativePreview
                    creative={newCampaign.creative}
                    platform={newCampaign.platform}
                    businessName={
                      newCampaign.name.split(" - ")[0] || "Business"
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-6 pt-4 border-t border-[var(--color-border)]">
                <button
                  onClick={() => handleRegenerate(newCampaign.id)}
                  disabled={creating}
                  className="px-4 py-2 border border-[var(--color-border)] rounded-lg text-[var(--text-main)] hover:bg-gray-50 disabled:opacity-50"
                >
                  {creating ? "Regenerating..." : "Regenerate"}
                </button>
                <button
                  onClick={() => handleApprove(newCampaign.id)}
                  disabled={approving}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {approving ? "Submitting..." : "Approve & Launch"}
                </button>
                <button
                  onClick={() => {
                    setView("list");
                    resetCreateFlow();
                    fetchData();
                  }}
                  className="px-4 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-main)]"
                >
                  Save as Draft
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LIST VIEW */}
      {view === "list" && (
        <>
          {campaigns.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-lg border border-[var(--color-border)]">
              <svg
                className="w-16 h-16 mx-auto text-gray-300 mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
                />
              </svg>
              <h3 className="text-lg font-medium text-[var(--text-main)]">
                No ad campaigns yet
              </h3>
              <p className="text-[var(--text-muted)] mt-1 mb-4">
                Create your first Facebook/Instagram ad campaign to reach new
                clients
              </p>
              <button
                onClick={() => setView("create")}
                className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((c) => (
                <Link
                  key={c.id}
                  href={`/srv/${expertId}/ads/${c.id}`}
                  className="block bg-white rounded-lg border border-[var(--color-border)] p-4 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-[var(--text-main)]">
                          {c.name}
                        </h3>
                        <CampaignStatusBadge status={c.status} />
                      </div>
                      <div className="flex gap-4 mt-1 text-sm text-[var(--text-muted)]">
                        <span>
                          {c.goal === "traffic" ? "Traffic" : "Lead Gen"}
                        </span>
                        <span className="capitalize">{c.platform}</span>
                        <span>${(c.budgetCents / 100).toFixed(2)} budget</span>
                      </div>
                    </div>
                    {c.metrics && (
                      <div className="text-right text-sm">
                        <p className="text-[var(--text-main)] font-medium">
                          {c.metrics.clicks} clicks
                        </p>
                        <p className="text-[var(--text-muted)]">
                          ${(c.metrics.spendCents / 100).toFixed(2)} spent
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
