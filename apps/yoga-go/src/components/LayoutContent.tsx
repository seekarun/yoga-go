'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Footer from './Footer';
import Header from './Header';
import { getClientExpertContext } from '@/lib/domainContext';

// Routes that should not show header/footer
const MINIMAL_LAYOUT_ROUTES = ['/', '/auth/signin', '/auth/signup'];

// Routes that should not show header/footer on expert domains
const EXPERT_MINIMAL_ROUTES = ['/auth/signin', '/auth/signup'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isExpertDomain, setIsExpertDomain] = useState(false);

  useEffect(() => {
    const { isExpertMode } = getClientExpertContext();
    setIsExpertDomain(isExpertMode);
  }, []);

  const isMinimalLayout =
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
