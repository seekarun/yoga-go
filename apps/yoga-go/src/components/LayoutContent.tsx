'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from './Footer';
import Header from './Header';
import { getClientExpertContext } from '@/lib/domainContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';

// Routes that should not show header/footer (they render their own)
const MINIMAL_LAYOUT_ROUTES = ['/', '/auth/signin', '/auth/signup'];

// Routes that should not show header/footer on expert domains
const EXPERT_MINIMAL_ROUTES = ['/auth/signin', '/auth/signup'];

// Route prefixes that render their own header/footer
const CUSTOM_LAYOUT_PREFIXES = ['/experts/'];

// Route prefixes that show header but not footer (dashboard pages with sidebar)
const NO_FOOTER_PREFIXES = ['/srv/', '/app/', '/admn'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isExpertDomain, setIsExpertDomain] = useState(false);
  const { user } = useAuth();

  // Get expertId for notification context
  const expertId = user?.expertProfile || null;
  const isExpertDashboard = pathname.startsWith('/srv/');

  useEffect(() => {
    const { isExpertMode } = getClientExpertContext();
    setIsExpertDomain(isExpertMode);
  }, []);

  // Check if this route has custom layout (renders its own header/footer)
  const hasCustomLayout = CUSTOM_LAYOUT_PREFIXES.some(prefix => pathname.startsWith(prefix));

  const isMinimalLayout =
    hasCustomLayout ||
    MINIMAL_LAYOUT_ROUTES.includes(pathname) ||
    (isExpertDomain && EXPERT_MINIMAL_ROUTES.includes(pathname));

  // Check if this route should hide footer (dashboard pages with sidebar)
  const hideFooter = NO_FOOTER_PREFIXES.some(prefix => pathname.startsWith(prefix));

  if (isMinimalLayout) {
    return <main className="flex-1">{children}</main>;
  }

  // Wrap with NotificationProvider for expert dashboard routes
  const content = (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );

  if (isExpertDashboard && expertId) {
    return <NotificationProvider expertId={expertId}>{content}</NotificationProvider>;
  }

  return content;
}
