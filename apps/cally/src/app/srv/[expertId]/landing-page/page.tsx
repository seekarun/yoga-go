"use client";

import { useParams } from "next/navigation";

/**
 * Landing page editor - placeholder
 */
export default function LandingPageEditorPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Landing Page
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Customize your public landing page.
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
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
          />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          Landing Page Editor
        </h3>
        <p className="text-[var(--text-muted)]">
          The landing page editor is coming soon. For now, use the yoga app to
          edit your landing page.
        </p>
      </div>
    </div>
  );
}
