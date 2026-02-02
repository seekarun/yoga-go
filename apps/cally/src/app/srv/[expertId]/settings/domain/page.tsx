"use client";

import { useParams } from "next/navigation";

/**
 * Domain & Email settings page - placeholder
 */
export default function DomainSettingsPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Domain & Email
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Configure your custom domain and email settings.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9"
          />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          Domain Settings
        </h3>
        <p className="text-[var(--text-muted)]">
          Domain configuration is coming soon. For now, use the yoga app to set
          up your custom domain.
        </p>
      </div>
    </div>
  );
}
