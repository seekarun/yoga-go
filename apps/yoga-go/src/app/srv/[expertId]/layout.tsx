'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import type { User } from '@/types';
import ExpertSidebar from '@/components/dashboard/ExpertSidebar';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import LoadingSpinner from '@/components/LoadingSpinner';

// Routes that have their own header and don't need the layout header
const routesWithOwnHeader: string[] = [];

// Route to header mapping
const getHeaderInfo = (
  pathname: string,
  expertId: string
): { title: string; subtitle?: string } | null => {
  const basePath = `/srv/${expertId}`;
  const relativePath = pathname.replace(basePath, '') || '/';

  // Check if this route has its own header
  for (const route of routesWithOwnHeader) {
    if (relativePath === route || relativePath.startsWith(route + '/')) {
      return null; // Don't show layout header
    }
  }

  const headers: Record<string, { title: string; subtitle?: string }> = {
    '/': { title: 'Dashboard', subtitle: 'Overview of your expert space' },
    '/inbox': { title: 'Inbox', subtitle: 'Messages from students' },
    '/users': { title: 'Users', subtitle: 'Users signed up via your space' },
    '/courses': { title: 'My Courses', subtitle: 'Manage your courses' },
    '/webinars': { title: 'Live Sessions', subtitle: 'Manage your live sessions' },
    '/blog': { title: 'Blog', subtitle: 'Manage your blog posts' },
    '/assets': { title: 'Assets', subtitle: 'Manage your images and videos' },
    '/survey': { title: 'Surveys', subtitle: 'Create and manage surveys' },
    '/analytics': { title: 'Analytics', subtitle: 'Track your performance' },
    '/settings': { title: 'Integrations', subtitle: 'Connect payment and other services' },
    '/preferences': { title: 'Settings', subtitle: 'Manage your account preferences' },
    '/edit': { title: 'Edit Profile', subtitle: 'Update your expert profile information' },
    '/recordings': { title: 'Recordings', subtitle: 'Manage your recorded sessions' },
    '/landing-page': { title: 'Landing Page', subtitle: 'Customize your public page' },
  };

  // Check for exact match first
  if (headers[relativePath]) {
    return headers[relativePath];
  }

  // Check for partial matches (for nested routes)
  for (const [route, info] of Object.entries(headers)) {
    if (relativePath.startsWith(route + '/')) {
      return info;
    }
  }

  return { title: 'Dashboard' };
};

const SIDEBAR_COLLAPSED_KEY = 'expert-sidebar-collapsed';

export default function ExpertDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const expertId = params.expertId as string;

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const headerInfo = getHeaderInfo(pathname, expertId);
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
      <div
        className="min-h-screen flex items-center justify-center pt-16"
        style={{ background: 'var(--color-bg-main)' }}
      >
        <LoadingSpinner size="lg" message="Verifying access..." />
      </div>
    );
  }

  // Not authorized - will redirect
  if (!authorized) {
    return null;
  }

  return (
    <div
      className="h-screen overflow-hidden flex flex-col pt-16"
      style={{ background: 'var(--color-bg-main)' }}
    >
      {/* Sidebar */}
      <ExpertSidebar expertId={expertId} />

      {/* Main Content - offset by sidebar width, fills remaining height */}
      <div
        className={`flex-1 overflow-auto transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-56'}`}
      >
        {/* Persistent Header - only show if route doesn't have its own header */}
        {headerInfo && <DashboardHeader title={headerInfo.title} subtitle={headerInfo.subtitle} />}

        {/* Page Content */}
        {children}
      </div>
    </div>
  );
}
