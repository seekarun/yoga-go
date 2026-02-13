"use client";

import type { AdCreative, AdPlatform } from "@/types";

interface AdCreativePreviewProps {
  creative: AdCreative;
  platform: AdPlatform;
  businessName: string;
}

export default function AdCreativePreview({
  creative,
  platform,
  businessName,
}: AdCreativePreviewProps) {
  const showFacebook = platform === "facebook" || platform === "both";
  const showInstagram = platform === "instagram" || platform === "both";

  return (
    <div className="space-y-4">
      {showFacebook && (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white max-w-md">
          <div className="p-3 flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-[var(--color-primary)] flex items-center justify-center text-white font-bold text-sm">
              {businessName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">
                {businessName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Sponsored</p>
            </div>
          </div>
          <div className="px-3 pb-2">
            <p className="text-sm text-[var(--text-main)]">
              {creative.primaryText}
            </p>
          </div>
          <div className="bg-gray-100 aspect-video flex items-center justify-center">
            {creative.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creative.imageUrl}
                alt="Ad preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-[var(--text-muted)]">
                <svg
                  className="w-12 h-12 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-xs">Ad image will be placed here</p>
              </div>
            )}
          </div>
          <div className="p-3 border-t border-gray-200">
            <p className="text-xs text-[var(--text-muted)] uppercase">
              {new URL(creative.linkUrl).hostname}
            </p>
            <p className="text-sm font-semibold text-[var(--text-main)]">
              {creative.headline}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {creative.description}
            </p>
          </div>
          <div className="px-3 pb-3">
            <span className="inline-block px-4 py-1.5 bg-gray-200 rounded text-sm font-medium text-[var(--text-main)]">
              {creative.callToAction.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}

      {showInstagram && (
        <div className="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white max-w-md">
          <div className="p-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-500 p-0.5">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                <span className="text-xs font-bold text-[var(--text-main)]">
                  {businessName.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">
                {businessName.toLowerCase().replace(/\s+/g, "")}
              </p>
              <p className="text-xs text-[var(--text-muted)]">Sponsored</p>
            </div>
          </div>
          <div className="bg-gray-100 aspect-square flex items-center justify-center">
            {creative.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creative.imageUrl}
                alt="Ad preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center text-[var(--text-muted)]">
                <svg
                  className="w-12 h-12 mx-auto mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-xs">Ad image will be placed here</p>
              </div>
            )}
          </div>
          <div className="p-3">
            <p className="text-sm font-semibold text-[var(--text-main)]">
              {creative.headline}
            </p>
            <p className="text-sm text-[var(--text-main)]">
              {creative.primaryText}
            </p>
          </div>
          <div className="px-3 pb-3">
            <span className="inline-block w-full text-center px-4 py-2 bg-[var(--color-primary)] text-white rounded text-sm font-medium">
              {creative.callToAction.replace(/_/g, " ")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
