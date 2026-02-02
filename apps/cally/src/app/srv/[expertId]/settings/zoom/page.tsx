"use client";

import { useParams } from "next/navigation";

/**
 * Zoom integration page - placeholder
 */
export default function ZoomSettingsPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Zoom</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Connect Zoom to create meetings automatically.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-[var(--color-border)] p-8 text-center">
        <svg
          className="w-12 h-12 mx-auto text-[var(--text-muted)] mb-4"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M4.585 4.585C2.264 4.585.38 6.468.38 8.79v6.42c0 2.322 1.884 4.205 4.205 4.205h10.05c.348 0 .63-.282.63-.63v-6.42c0-.348-.282-.63-.63-.63H8.79a.63.63 0 0 1-.63-.63V8.79c0-.348.282-.63.63-.63h6.42c.348 0 .63-.282.63-.63V4.585c0-.348-.282-.63-.63-.63H4.585zm14.63 5.04v4.16l3.785 2.84V6.785l-3.785 2.84z" />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          Zoom Integration
        </h3>
        <p className="text-[var(--text-muted)] mb-6">
          Connect your Zoom account to automatically create meeting links.
        </p>
        <button className="px-6 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors">
          Connect Zoom
        </button>
      </div>
    </div>
  );
}
