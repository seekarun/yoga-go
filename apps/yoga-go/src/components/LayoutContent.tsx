'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from './Footer';
import Header from './Header';
import { getClientExpertContext } from '@/lib/domainContext';

// Routes that should not show header/footer (they render their own)
const MINIMAL_LAYOUT_ROUTES = ['/', '/auth/signin', '/auth/signup'];

// Routes that should not show header/footer on expert domains
const EXPERT_MINIMAL_ROUTES = ['/auth/signin', '/auth/signup'];

// Route prefixes that render their own header/footer
const CUSTOM_LAYOUT_PREFIXES = ['/experts/'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isExpertDomain, setIsExpertDomain] = useState(false);

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

  if (isMinimalLayout) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
