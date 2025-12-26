'use client';

import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { ExpertProvider, useExpert } from '@/contexts/ExpertContext';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';
import LoadingSpinner from '@/components/LoadingSpinner';

// Inner component that can use the useExpert hook
function ExpertLayoutInner({ children }: { children: ReactNode }) {
  const { palette, loading } = useExpert();

  // Show a minimal loading state while expert data is being fetched
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return <LandingPageThemeProvider palette={palette}>{children}</LandingPageThemeProvider>;
}

export default function ExpertLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const expertId = params.expertId as string;

  return (
    <ExpertProvider expertId={expertId}>
      <ExpertLayoutInner>{children}</ExpertLayoutInner>
    </ExpertProvider>
  );
}
