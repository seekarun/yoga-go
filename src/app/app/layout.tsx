'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ProfileCompletionModal from './ProfileCompletionModal';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user, refreshUser } = useAuth();
  const router = useRouter();
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Check if user needs to complete their profile
  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('[DBG][app/layout] Checking profile completion:', {
        name: user.profile.name,
        email: user.profile.email,
        onboardingCompleted: user.profile.onboardingCompleted,
        shouldShowModal: user.profile.onboardingCompleted !== true,
      });

      // Show modal if user hasn't completed onboarding
      if (user.profile.onboardingCompleted !== true) {
        console.log('[DBG][app/layout] Onboarding incomplete, showing modal');
        setShowProfileModal(true);
      } else {
        console.log('[DBG][app/layout] Onboarding completed, modal not needed');
        setShowProfileModal(false);
      }
    }
  }, [isLoading, isAuthenticated, user]);

  const handleProfileComplete = async () => {
    console.log('[DBG][app/layout] Profile completion modal closed, refreshing user');
    await refreshUser();
    setShowProfileModal(false);
  };

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f8f8f8',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              border: '4px solid #e0e0e0',
              borderTop: '4px solid var(--color-primary)',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
      {children}
      {showProfileModal && user && (
        <ProfileCompletionModal user={user} onComplete={handleProfileComplete} />
      )}
    </div>
  );
}
