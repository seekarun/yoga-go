"use client";

import type { AdCampaignStatus } from "@/types";

const STATUS_STYLES: Record<
  AdCampaignStatus,
  { bg: string; text: string; label: string }
> = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  approved: { bg: "bg-blue-100", text: "text-blue-700", label: "Approved" },
  submitting: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Submitting",
  },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  paused: { bg: "bg-orange-100", text: "text-orange-700", label: "Paused" },
  completed: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    label: "Completed",
  },
  failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
};

interface CampaignStatusBadgeProps {
  status: AdCampaignStatus;
}

export default function CampaignStatusBadge({
  status,
}: CampaignStatusBadgeProps) {
  const style = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
    >
      {style.label}
    </span>
  );
}
