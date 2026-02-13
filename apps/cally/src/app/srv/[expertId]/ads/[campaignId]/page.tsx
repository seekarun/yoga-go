"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import type { AdCampaign } from "@/types";
import CampaignStatusBadge from "@/components/ads/CampaignStatusBadge";
import AdMetricsCard from "@/components/ads/AdMetricsCard";
import AdCreativePreview from "@/components/ads/AdCreativePreview";

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const campaignId = params.campaignId as string;

  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchCampaign = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/data/app/ads/campaigns/${campaignId}`);
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data);
      } else {
        setError(json.error || "Campaign not found");
      }
    } catch {
      setError("Failed to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/data/app/ads/campaigns/${campaignId}/pause`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to pause campaign");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/data/app/ads/campaigns/${campaignId}/resume`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to resume campaign");
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/data/app/ads/campaigns/${campaignId}/approve`,
        { method: "POST" },
      );
      const json = await res.json();
      if (json.success) {
        setCampaign(json.data);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to approve campaign");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/data/app/ads/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        router.push(`/srv/${expertId}/ads`);
      } else {
        setError(json.error);
      }
    } catch {
      setError("Failed to delete campaign");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-16">
        <p className="text-[var(--text-muted)]">
          {error || "Campaign not found"}
        </p>
        <Link
          href={`/srv/${expertId}/ads`}
          className="text-[var(--color-primary)] mt-2 inline-block"
        >
          Back to Campaigns
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/srv/${expertId}/ads`}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text-main)] mb-1 inline-block"
          >
            &larr; Back to Campaigns
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[var(--text-main)]">
              {campaign.name}
            </h1>
            <CampaignStatusBadge status={campaign.status} />
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <>
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Approve & Launch
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
          {campaign.status === "active" && (
            <button
              onClick={handlePause}
              disabled={actionLoading}
              className="px-4 py-2 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {campaign.status === "paused" && (
            <button
              onClick={handleResume}
              disabled={actionLoading}
              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            >
              Resume
            </button>
          )}
          {campaign.status === "failed" && (
            <button
              onClick={handleDelete}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {campaign.failureReason && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
          <strong>Error:</strong> {campaign.failureReason}
        </div>
      )}

      {/* Metrics (if active/paused/completed) */}
      {campaign.metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <AdMetricsCard
            label="Impressions"
            value={campaign.metrics.impressions.toLocaleString()}
          />
          <AdMetricsCard
            label="Clicks"
            value={campaign.metrics.clicks.toLocaleString()}
            subValue={`CTR: ${campaign.metrics.ctr.toFixed(2)}%`}
          />
          <AdMetricsCard
            label="Spent"
            value={`$${(campaign.metrics.spendCents / 100).toFixed(2)}`}
            subValue={`CPC: $${campaign.metrics.cpc.toFixed(2)}`}
          />
          {campaign.goal === "lead_generation" ? (
            <AdMetricsCard
              label="Leads"
              value={campaign.metrics.leads.toString()}
              subValue={
                campaign.metrics.costPerLeadCents > 0
                  ? `$${(campaign.metrics.costPerLeadCents / 100).toFixed(2)}/lead`
                  : undefined
              }
            />
          ) : (
            <AdMetricsCard
              label="Reach"
              value={campaign.metrics.reach.toLocaleString()}
            />
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Campaign Info */}
        <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-main)]">
            Campaign Details
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-[var(--text-muted)]">Goal</p>
              <p className="text-[var(--text-main)]">
                {campaign.goal === "traffic"
                  ? "Drive Traffic"
                  : "Lead Generation"}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Platform</p>
              <p className="text-[var(--text-main)] capitalize">
                {campaign.platform}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Budget</p>
              <p className="text-[var(--text-main)]">
                ${(campaign.budgetCents / 100).toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-[var(--text-muted)]">Created</p>
              <p className="text-[var(--text-main)]">
                {new Date(campaign.createdAt).toLocaleDateString()}
              </p>
            </div>
            {campaign.approvedAt && (
              <div>
                <p className="text-sm text-[var(--text-muted)]">Approved</p>
                <p className="text-[var(--text-main)]">
                  {new Date(campaign.approvedAt).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <h3 className="text-md font-semibold text-[var(--text-main)] pt-2 border-t border-[var(--color-border)]">
            Targeting
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--text-muted)]">Ages:</span>{" "}
              {campaign.targeting.ageMin}-{campaign.targeting.ageMax}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Locations:</span>{" "}
              {campaign.targeting.locations.map((l) => l.name).join(", ") ||
                "Broad"}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Interests:</span>{" "}
              {campaign.targeting.interests.map((i) => i.name).join(", ") ||
                "None"}
            </p>
          </div>

          <h3 className="text-md font-semibold text-[var(--text-main)] pt-2 border-t border-[var(--color-border)]">
            Creative
          </h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="text-[var(--text-muted)]">Headline:</span>{" "}
              {campaign.creative.headline}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Primary Text:</span>{" "}
              {campaign.creative.primaryText}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Description:</span>{" "}
              {campaign.creative.description}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">CTA:</span>{" "}
              {campaign.creative.callToAction.replace(/_/g, " ")}
            </p>
            <p>
              <span className="text-[var(--text-muted)]">Link:</span>{" "}
              {campaign.creative.linkUrl}
            </p>
          </div>
        </div>

        {/* Ad Preview */}
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
            Ad Preview
          </h2>
          <AdCreativePreview
            creative={campaign.creative}
            platform={campaign.platform}
            businessName={campaign.name.split(" - ")[0] || "Business"}
          />
        </div>
      </div>
    </div>
  );
}
