'use client';

import { use, useEffect, useState } from 'react';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import { useRouter } from 'next/navigation';
import ExpertVideoRoom from '@/components/ExpertVideoRoom';

export default function ExpertHostPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = use(params);
  const router = useRouter();

  const [authToken, setAuthToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchToken() {
      try {
        console.log('[DBG][ExpertHostPage] Fetching join token for session:', sessionId);

        const response = await fetch(`/api/live/sessions/${sessionId}/join-token`, {
          method: 'POST',
        });

        const data = await response.json();

        if (!data.success) {
          setError(data.error || 'Failed to get access token');
          setLoading(false);
          return;
        }

        console.log('[DBG][ExpertHostPage] Token received, role:', data.data.role);
        setAuthToken(data.data.token);
        setLoading(false);
      } catch (err: any) {
        console.error('[DBG][ExpertHostPage] Error fetching token:', err);
        setError(err.message || 'Failed to load session');
        setLoading(false);
      }
    }

    fetchToken();
  }, [sessionId]);

  const handleLeave = () => {
    console.log('[DBG][ExpertHostPage] Leaving session');
    router.push('/srv');
  };

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a202c',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔄</div>
          <h2 style={{ color: '#fff', marginBottom: '8px' }}>Preparing video session...</h2>
          <p style={{ color: '#a0aec0' }}>Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1a202c',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '500px', padding: '40px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: '#e53e3e', marginBottom: '16px' }}>Error</h2>
          <p style={{ color: '#a0aec0', marginBottom: '24px' }}>{error}</p>
          <button
            onClick={() => router.push('/srv')}
            style={{
              padding: '12px 24px',
              background: '#3182ce',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <HMSRoomProvider>
      <ExpertVideoRoom authToken={authToken} sessionId={sessionId} onLeave={handleLeave} />
    </HMSRoomProvider>
  );
}
