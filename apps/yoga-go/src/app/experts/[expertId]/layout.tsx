'use client';

import type { ReactNode } from 'react';
import { useParams } from 'next/navigation';
import { ExpertProvider, useExpert } from '@/contexts/ExpertContext';
import { LandingPageThemeProvider } from '@/components/landing-page/ThemeProvider';

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
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTop: '4px solid #6b7280',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
