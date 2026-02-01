'use client';

import ExpertOnboarding from '@/components/ExpertOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import type { Expert } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function ExpertPlatform() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [expertProfile, setExpertProfile] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper to check if user has a role (handles array format)
  const hasRole = (role: string) => {
    if (!user?.role) return false;
    return Array.isArray(user.role)
      ? user.role.includes(role as 'learner' | 'expert' | 'admin')
      : user.role === role;
  };

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/signin');
      return;
    }

    // Only fetch expert profile if user is an expert
    if (isAuthenticated && hasRole('expert')) {
      fetchExpertProfile();
    } else if (isAuthenticated) {
      // Authenticated but not expert - will show onboarding
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading, user]);

  const fetchExpertProfile = async () => {
    console.log('[DBG][srv/page.tsx] Fetching expert profile');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/data/app/expert/me');
      const result = await response.json();

      console.log('[DBG][srv/page.tsx] Expert profile response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch expert profile');
      }

      if (result.success && result.data) {
        setExpertProfile(result.data);
      } else {
        // Expert profile doesn't exist yet
        setExpertProfile(null);
      }
    } catch (err) {
      console.error('[DBG][srv/page.tsx] Error fetching expert profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expert profile');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is loading or redirecting
  if (authLoading || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Case 1: User is not authenticated - redirect handled in useEffect
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Redirecting to login...</div>
        </div>
      </div>
    );
  }

  // Case 2: User is authenticated but NOT an expert - show onboarding
  // Expert role will be added when onboarding is completed
  if (!hasRole('expert')) {
    return (
      <div style={{ paddingTop: '64px' }}>
        <ExpertOnboarding
          userEmail={user?.profile.email || ''}
          userName={user?.profile?.name || user?.profile.email.split('@')[0] || 'Expert'}
        />
      </div>
    );
  }

  // Case 3: User is expert with error - Show Error State
  if (hasRole('expert') && error) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7fafc',
        }}
      >
        <div style={{ maxWidth: '600px', padding: '40px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            ⚠️
          </div>
          <h1
            style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#2d3748' }}
          >
            Expert Profile Error
          </h1>
          <p
            style={{ fontSize: '16px', color: '#718096', marginBottom: '24px', lineHeight: '1.6' }}
          >
            {error}
          </p>
          <div
            style={{
              background: '#fffaf0',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: '#744210',
                marginBottom: '12px',
                fontWeight: '600',
              }}
            >
              Possible causes:
            </p>
            <ul style={{ fontSize: '14px', color: '#744210', paddingLeft: '20px', margin: 0 }}>
              <li>Your expert profile link may be broken</li>
              <li>The expert profile was deleted or moved</li>
              <li>Database connection issue</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <PrimaryButton
              onClick={() => {
                setError('');
                fetchExpertProfile();
              }}
            >
              Retry
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setError('');
                setExpertProfile(null);
              }}
            >
              Reset & Re-onboard
            </SecondaryButton>
            <Link
              href="/app"
              style={{
                padding: '12px 24px',
                background: '#fff',
                color: '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Back to App
            </Link>
          </div>
          <div style={{ marginTop: '24px', fontSize: '14px', color: '#a0aec0' }}>
            Need help? Contact support with error details above
          </div>
        </div>
      </div>
    );
  }

  // Case 4: User is expert but profile doesn't exist - Show Onboarding
  if (hasRole('expert') && !expertProfile) {
    return (
      <div style={{ paddingTop: '64px' }}>
        <ExpertOnboarding
          userEmail={user?.profile.email || ''}
          userName={user?.profile?.name || user?.profile.email.split('@')[0] || 'Expert'}
        />
      </div>
    );
  }

  // Case 5: User is expert with completed profile - Redirect to expert dashboard
  if (hasRole('expert') && expertProfile) {
    router.push(`/srv/${expertProfile.id}`);
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Redirecting to dashboard...</div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>
          Something went wrong. Please try again.
        </div>
      </div>
    </div>
  );
}
