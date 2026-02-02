"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

/**
 * User preferences/settings page
 */
export default function PreferencesPage() {
  const params = useParams();
  const _expertId = params.expertId as string;
  const { user, logout } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Settings</h1>
        <p className="text-[var(--text-muted)] mt-1">
          Manage your account preferences.
        </p>
      </div>

      {/* Account Section */}
      <div className="bg-white rounded-lg border border-[var(--color-border)] p-6 mb-6">
        <h2 className="text-lg font-semibold text-[var(--text-main)] mb-4">
          Account
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Email
            </label>
            <p className="text-[var(--text-body)]">
              {user?.profile?.email || "Not set"}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">
              Name
            </label>
            <p className="text-[var(--text-body)]">
              {user?.profile?.name || "Not set"}
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-[var(--text-main)]">Sign Out</p>
            <p className="text-sm text-[var(--text-muted)]">
              Sign out of your account on this device.
            </p>
          </div>
          <button
            onClick={() => logout("/")}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
