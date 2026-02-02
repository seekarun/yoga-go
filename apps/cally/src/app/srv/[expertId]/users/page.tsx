"use client";

import { useParams } from "next/navigation";

/**
 * Users management page - placeholder
 */
export default function UsersPage() {
  const params = useParams();
  const _expertId = params.expertId as string;

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Users</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your audience and subscribers.
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
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
        <h3 className="text-lg font-medium text-[var(--text-main)] mb-2">
          No users yet
        </h3>
        <p className="text-[var(--text-muted)]">
          When people sign up through your landing page, they will appear here.
        </p>
      </div>
    </div>
  );
}
