'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { User } from '@/types';
import ExpertSidebar from '@/components/dashboard/ExpertSidebar';
import LoadingSpinner from '@/components/LoadingSpinner';

const SIDEBAR_COLLAPSED_KEY = 'expert-sidebar-collapsed';

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  // Check authorization on mount
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const checkSidebarState = () => {
      const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      setSidebarCollapsed(saved === 'true');
    };
    checkSidebarState();

    // Listen for changes from sidebar toggle
    const handleStorageChange = () => checkSidebarState();
    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab updates
    const handleSidebarToggle = () => checkSidebarState();
    window.addEventListener('sidebar-toggle', handleSidebarToggle);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('sidebar-toggle', handleSidebarToggle);
    };
  }, []);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][expert-layout] Checking authorization for expertId:', expertId);

      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success || !data.data) {
        console.log('[DBG][expert-layout] Not authenticated, redirecting to login');
        router.push('/');
        return;
      }

      const user: User = data.data;

      // Check if user is an expert
      const isExpert = Array.isArray(user.role)
        ? user.role.includes('expert')
        : user.role === 'expert';

      if (!isExpert) {
        console.log('[DBG][expert-layout] User is not an expert, redirecting to home');
        router.push('/');
        return;
      }

      // Check if expert profile is set up
      if (!user.expertProfile) {
        console.log('[DBG][expert-layout] Expert profile not set up, redirecting to onboarding');
        router.push('/srv');
        return;
      }

      // Check if user owns this expert profile
      if (user.expertProfile !== expertId) {
        console.log("[DBG][expert-layout] User doesn't own this profile, redirecting");
        router.push(`/srv/${user.expertProfile}`);
        return;
      }

      console.log('[DBG][expert-layout] Authorization check passed');
      setAuthorized(true);
      setAuthChecking(false);
    } catch (err) {
      console.error('[DBG][expert-layout] Error checking authorization:', err);
      router.push('/');
    }
  };

  // Loading state while checking auth
  if (authChecking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <LoadingSpinner size="lg" message="Verifying access..." />
      </div>
    );
  }

  // Not authorized - will redirect
  if (!authorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      {/* Sidebar */}
      <ExpertSidebar expertId={expertId} />

      {/* Main Content - offset by sidebar width */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}>
        {children}
      </div>
    </div>
  );
}
