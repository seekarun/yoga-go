"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export default function HomePage() {
  const { isAuthenticated, isLoading, login } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <span className="text-2xl font-bold text-[var(--color-primary)]">
                Cally
              </span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <Link
                  href="/srv"
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <button
                  onClick={() => login()}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-main)] mb-6">
            Your Scheduling & Landing Page Platform
          </h1>
          <p className="text-xl text-[var(--text-body)] mb-8 max-w-2xl mx-auto">
            Create beautiful landing pages, manage your calendar, and schedule
            live sessions with your audience. All in one place.
          </p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => login("/srv")}
              className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors text-lg font-medium"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Features */}
        <div className="mt-24 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-[var(--color-primary)]/10 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--color-primary)]"
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
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
              Landing Pages
            </h3>
            <p className="text-[var(--text-body)]">
              Create stunning landing pages with our easy-to-use editor. No
              coding required.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-[var(--color-secondary)]/10 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--color-secondary)]"
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
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
              Calendar
            </h3>
            <p className="text-[var(--text-body)]">
              Manage your schedule and let others book time with you
              effortlessly.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg border border-[var(--color-border)]">
            <div className="w-12 h-12 bg-[var(--color-highlight)]/10 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-[var(--color-highlight)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-main)] mb-2">
              Live Sessions
            </h3>
            <p className="text-[var(--text-body)]">
              Host video calls with Zoom or Google Meet integration.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
