'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';
import Header from './Header';

// Routes that should not show header/footer
const MINIMAL_LAYOUT_ROUTES = ['/'];

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMinimalLayout = MINIMAL_LAYOUT_ROUTES.includes(pathname);

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
