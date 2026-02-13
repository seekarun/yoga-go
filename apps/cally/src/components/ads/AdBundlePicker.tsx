"use client";

import type { AdBundleId } from "@/types";
import { AD_BUNDLES } from "@/types";

interface AdBundlePickerProps {
  selected: AdBundleId | null;
  onSelect: (bundleId: AdBundleId) => void;
}

const BUNDLE_ORDER: AdBundleId[] = ["bundle_50", "bundle_100", "bundle_200"];

export default function AdBundlePicker({
  selected,
  onSelect,
}: AdBundlePickerProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {BUNDLE_ORDER.map((id) => {
        const bundle = AD_BUNDLES[id];
        const isSelected = selected === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`relative rounded-lg border-2 p-4 text-left transition-all ${
              isSelected
                ? "border-[var(--color-primary)] bg-blue-50"
                : "border-[var(--color-border)] hover:border-gray-300"
            }`}
          >
            <p className="text-lg font-bold text-[var(--text-main)]">
              ${bundle.totalAmountCents / 100}
            </p>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              ${bundle.adSpendCents / 100} ad spend
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              ${bundle.serviceFeeCents / 100} service fee
            </p>
            {isSelected && (
              <div className="absolute top-2 right-2">
                <svg
                  className="w-5 h-5 text-[var(--color-primary)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
