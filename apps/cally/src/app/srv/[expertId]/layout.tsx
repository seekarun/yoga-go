"use client";

import CallySidebar from "@/components/dashboard/CallySidebar";
import { DashboardChatWidget } from "@/components/ai";
import { NotificationProvider } from "@/contexts/NotificationContext";
import NotificationToast from "@/components/notifications/NotificationToast";
import { useAuth } from "@/contexts/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, isLoading, isExpert } = useAuth();
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar toggle events
  useEffect(() => {
    const handleToggle = (e: CustomEvent<{ collapsed: boolean }>) => {
      setSidebarCollapsed(e.detail.collapsed);
    };

    window.addEventListener("sidebar-toggle", handleToggle as EventListener);

    // Check initial state from localStorage
    const saved = localStorage.getItem("cally-sidebar-collapsed");
    if (saved) {
      setSidebarCollapsed(saved === "true");
    }

    return () => {
      window.removeEventListener(
        "sidebar-toggle",
        handleToggle as EventListener,
      );
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push("/auth/signin?callbackUrl=/srv");
      return;
    }

    // Verify user has expert role and owns this profile
    if (!isExpert) {
      router.push("/srv");
      return;
    }

    if (user?.expertProfile !== expertId) {
      // Redirect to user's own dashboard
      if (user?.expertProfile) {
        router.push(`/srv/${user.expertProfile}`);
      } else {
        router.push("/srv");
      }
    }
  }, [isAuthenticated, isLoading, isExpert, user, expertId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  if (!isAuthenticated || !isExpert || user?.expertProfile !== expertId) {
    return null; // Will redirect
  }

  return (
    <NotificationProvider tenantId={expertId}>
      <div className="min-h-screen bg-[var(--color-bg-main)]">
        <CallySidebar expertId={expertId} />
        <main
          className={`transition-all duration-300 ${sidebarCollapsed ? "ml-16" : "ml-56"}`}
          style={{ minHeight: "100vh" }}
        >
          {children}
        </main>
        <DashboardChatWidget />
        <NotificationToast />
      </div>
    </NotificationProvider>
  );
}
