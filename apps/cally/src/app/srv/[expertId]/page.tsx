"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

/**
 * Dashboard home page
 */
export default function DashboardPage() {
  const params = useParams();
  const expertId = params.expertId as string;

  const quickActions = [
    {
      title: "Edit Landing Page",
      description: "Customize your public page",
      href: `/srv/${expertId}/landing-page`,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
          />
        </svg>
      ),
    },
    {
      title: "Manage Calendar",
      description: "View and schedule events",
      href: `/srv/${expertId}/calendar`,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: "Connect Integrations",
      description: "Set up Zoom, Google, Stripe",
      href: `/srv/${expertId}/settings`,
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
    },
    {
      title: "Set Up Domain",
      description: "Configure your custom domain",
      href: `/srv/${expertId}/settings/domain`,
      icon: (
        <svg
          className="w-6 h-6"
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
      ),
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">
          Dashboard
        </h1>
        <p className="text-[var(--text-muted)] mt-1">
          Welcome back! Here is an overview of your account.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.title}
              href={action.href}
              className="bg-white p-4 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-primary)] hover:shadow-md transition-all group"
            >
              <div className="w-10 h-10 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center mb-3 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-white transition-colors">
                {action.icon}
              </div>
              <h3 className="font-medium text-[var(--text-main)]">
                {action.title}
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                {action.description}
              </p>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Placeholder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg border border-[var(--color-border)]">
          <p className="text-sm text-[var(--text-muted)]">Total Users</p>
          <p className="text-3xl font-bold text-[var(--text-main)] mt-1">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-[var(--color-border)]">
          <p className="text-sm text-[var(--text-muted)]">Upcoming Events</p>
          <p className="text-3xl font-bold text-[var(--text-main)] mt-1">0</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-[var(--color-border)]">
          <p className="text-sm text-[var(--text-muted)]">Page Views (7d)</p>
          <p className="text-3xl font-bold text-[var(--text-main)] mt-1">0</p>
        </div>
      </div>
    </div>
  );
}
