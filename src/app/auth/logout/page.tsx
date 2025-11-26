'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import NotificationOverlay from '@/components/NotificationOverlay';

function LogoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/';
  const [showConfirmation, setShowConfirmation] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Handle escape key to go back
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoggingOut) {
        router.back();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, isLoggingOut]);

  const handleConfirmLogout = () => {
    console.log('[DBG][logout-page] User confirmed logout, returnTo:', returnTo);
    setIsLoggingOut(true);
    setShowConfirmation(false);

    // Navigate directly to the GET logout endpoint
    // This is more reliable than fetch + redirect because:
    // 1. Server returns redirect (302) with Set-Cookie headers to clear cookies
    // 2. Browser processes Set-Cookie headers during redirect
    // 3. No issues with credentials mode or timing
    window.location.href = `/api/auth/do-logout?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleCancel = () => {
    console.log('[DBG][logout-page] User cancelled logout');
    setShowConfirmation(false);
    router.back();
  };

  // Show loading state while logging out
  if (isLoggingOut) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            background: '#fff',
            padding: '32px 48px',
            borderRadius: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '16px', color: '#666' }}>Signing out...</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <NotificationOverlay
        isOpen={showConfirmation}
        onClose={handleCancel}
        message="Are you sure you want to sign out?"
        type="warning"
        onConfirm={handleConfirmLogout}
        confirmText="Sign Out"
        cancelText="Cancel"
      />
    </div>
  );
}

export default function LogoutPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ color: '#fff', fontSize: '16px' }}>Loading...</div>
        </div>
      }
    >
      <LogoutContent />
    </Suspense>
  );
}
