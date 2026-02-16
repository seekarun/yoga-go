"use client";

import type { DomainPurchaseConfig } from "@/types";

interface PurchasedDomainBannerProps {
  purchaseConfig: DomainPurchaseConfig;
}

export default function PurchasedDomainBanner({
  purchaseConfig,
}: PurchasedDomainBannerProps) {
  const renewalDate = new Date(purchaseConfig.renewalDate).toLocaleDateString();

  return (
    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
          Registered via CallyGo
        </span>
        <span className="text-xs text-gray-500">Renews {renewalDate}</span>
      </div>
      <span className="text-xs text-gray-500">
        {purchaseConfig.autoRenew ? "Auto-renew on" : "Auto-renew off"}
      </span>
    </div>
  );
}
