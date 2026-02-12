"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Onboarding gateway page
 * Checks if user has expert profile, redirects accordingly
 */
export default function SrvPage() {
  const { user, isAuthenticated, isLoading, isExpert } = useAuth();
  const router = useRouter();
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/signin?callbackUrl=/srv");
      return;
    }

    // Check if user has expert profile
    if (isExpert && user?.expertProfile) {
      // Redirect to dashboard
      router.push(`/srv/${user.expertProfile}`);
    } else {
      // Show onboarding (for now, just show a message)
      setCheckingProfile(false);
    }
  }, [isAuthenticated, isLoading, isExpert, user, router]);

  if (isLoading || checkingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Loading...</p>
        </div>
      </div>
    );
  }

  // Show onboarding form for users without expert profile
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-bg-main)]">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-[var(--text-main)] mb-4">
            Welcome to CallyGo
          </h1>
          <p className="text-[var(--text-body)] mb-6">
            Set up your profile to start creating landing pages and managing
            your calendar.
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            Onboarding coming soon. For now, please use the yoga app to create
            your expert profile.
          </p>
        </div>
      </div>
    </div>
  );
}
