'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExpertLiveSessions from '@/components/ExpertLiveSessions';
import type { User } from '@/types';

export default function ExpertLiveDashboard({ params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = use(params);
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);

  // Check authorization first
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const checkAuthorization = async () => {
    try {
      console.log('[DBG][live-dashboard] Checking authorization for expertId:', expertId);

      // Fetch current user
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.success || !data.data) {
        console.log('[DBG][live-dashboard] Not authenticated, redirecting to login');
        router.push('/');
        return;
      }

      const user: User = data.data;

      // Check if user is an expert
      if (user.role !== 'expert') {
        console.log('[DBG][live-dashboard] User is not an expert, redirecting to home');
        router.push('/');
        return;
      }

      // Check if expert profile is set up
      if (!user.expertProfile) {
        console.log(
          '[DBG][live-dashboard] Expert profile not set up yet, redirecting to onboarding'
        );
        router.push('/srv');
        return;
      }

      // Check if user owns this expert profile
      if (user.expertProfile !== expertId) {
        console.log(
          `[DBG][live-dashboard] User doesn't own this profile. user.expertProfile=${user.expertProfile}, requested=${expertId}`
        );
        console.log('[DBG][live-dashboard] Redirecting to own dashboard:', user.expertProfile);
        router.push(`/srv/${user.expertProfile}/live`);
        return;
      }

      console.log('[DBG][live-dashboard] Authorization check passed');
      setAuthChecking(false);
    } catch (err) {
      console.error('[DBG][live-dashboard] Error checking authorization:', err);
      router.push('/');
    }
  };

  if (authChecking) {
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
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto',
            }}
          />
          <p style={{ marginTop: '16px', color: '#718096' }}>Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
            Live Sessions
          </h1>
          <p style={{ color: '#718096' }}>Manage your live video sessions with students</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => router.push(`/srv/${expertId}/live/availability`)}
            style={{
              padding: '12px 24px',
              background: '#fff',
              border: '2px solid #667eea',
              color: '#667eea',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            📅 Set Availability
          </button>

          <button
            onClick={() => router.push(`/srv/${expertId}/live/create`)}
            style={{
              padding: '12px 24px',
              background: '#667eea',
              border: 'none',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            + Create Session
          </button>
        </div>
      </div>

      <ExpertLiveSessions expertId={expertId} />
    </div>
  );
}
