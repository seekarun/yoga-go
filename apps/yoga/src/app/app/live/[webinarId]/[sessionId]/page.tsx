'use client';

/**
 * Live Session Page
 *
 * Displays 100ms video room for live webinar sessions
 * Fetches auth token and renders HmsVideoRoom component
 */

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HMSRoomProvider } from '@100mslive/react-sdk';
import HmsVideoRoom from '@/components/HmsVideoRoom';
import { getSubdomainUrl } from '@/config/env';
import type { Webinar, WebinarSession } from '@/types';

interface JoinSessionResponse {
  authToken: string;
  roomId: string;
  role: 'host' | 'guest';
  userName: string;
}

interface PageProps {
  params: Promise<{
    webinarId: string;
    sessionId: string;
  }>;
}

export default function LiveSessionPage({ params }: PageProps) {
  const { webinarId, sessionId } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joinData, setJoinData] = useState<JoinSessionResponse | null>(null);
  const [webinar, setWebinar] = useState<Webinar | null>(null);
  const [session, setSession] = useState<WebinarSession | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[DBG][live-session] Fetching session data...');

        // Fetch webinar details
        const webinarRes = await fetch(`/data/app/webinars/${webinarId}`);
        const webinarData = await webinarRes.json();

        if (!webinarData.success) {
          setError(webinarData.error || 'Failed to load webinar');
          setLoading(false);
          return;
        }

        setWebinar(webinarData.data);

        // Find the session
        const foundSession = webinarData.data.sessions.find(
          (s: WebinarSession) => s.id === sessionId
        );

        if (!foundSession) {
          setError('Session not found');
          setLoading(false);
          return;
        }

        setSession(foundSession);

        // Check if session has 100ms room
        if (!foundSession.hmsRoomId) {
          setError('This session does not have video enabled');
          setLoading(false);
          return;
        }

        // Fetch auth token to join
        const joinRes = await fetch(`/data/app/webinars/${webinarId}/sessions/${sessionId}/join`, {
          method: 'POST',
        });
        const joinResponse = await joinRes.json();

        if (!joinResponse.success) {
          setError(joinResponse.error || 'Failed to join session');
          setLoading(false);
          return;
        }

        setJoinData(joinResponse.data);
        console.log('[DBG][live-session] Join data received, role:', joinResponse.data.role);
      } catch (err) {
        console.error('[DBG][live-session] Error:', err);
        setError('Failed to load session');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [webinarId, sessionId]);

  const handleLeave = () => {
    router.push(`/app/webinars/${webinarId}`);
  };

  const handleCopyLink = async () => {
    // Use expert subdomain for share URL
    const expertId = webinar?.expertId;
    const baseUrl = expertId ? getSubdomainUrl(expertId) : window.location.origin;
    const shareUrl = `${baseUrl}/app/live/${webinarId}/${sessionId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[DBG][live-session] Copy error:', err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#1a1a1a',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #333',
            borderTop: '3px solid var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ color: '#fff', marginTop: '16px' }}>Preparing session...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          background: '#f8f8f8',
          padding: '20px',
        }}
      >
        <div
          style={{
            maxWidth: '400px',
            textAlign: 'center',
            background: '#fff',
            padding: '40px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>Video Error</div>
          <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Unable to Join Session</h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>{error}</p>
          <Link
            href={webinarId ? `/app/webinars/${webinarId}` : '/app/webinars'}
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: 'var(--color-primary)',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            Go Back
          </Link>
        </div>
      </div>
    );
  }

  if (!joinData) {
    return null;
  }

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 64px)',
        background: '#1a1a1a',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: '12px 20px',
          background: '#262626',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #333',
        }}
      >
        <div>
          <h1 style={{ color: '#fff', fontSize: '16px', fontWeight: '600', margin: 0 }}>
            {session?.title || 'Live Session'}
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '13px', margin: '4px 0 0 0' }}>
            {webinar?.title}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {joinData.role === 'host' && (
            <span
              style={{
                padding: '4px 10px',
                background: 'var(--color-primary)',
                color: '#fff',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
              }}
            >
              Host
            </span>
          )}
          <button
            onClick={handleCopyLink}
            style={{
              padding: '8px 16px',
              background: copied ? '#16a34a' : '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            {copied ? (
              <>
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg
                  style={{ width: '16px', height: '16px' }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
                Share Link
              </>
            )}
          </button>
          <button
            onClick={handleLeave}
            style={{
              padding: '8px 16px',
              background: '#374151',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Exit
          </button>
        </div>
      </header>

      {/* Video Room */}
      <main
        style={{
          flex: 1,
          padding: '16px',
          maxWidth: '1400px',
          width: '100%',
          margin: '0 auto',
        }}
      >
        <HMSRoomProvider>
          <HmsVideoRoom
            authToken={joinData.authToken}
            userName={joinData.userName}
            onLeave={handleLeave}
          />
        </HMSRoomProvider>
      </main>
    </div>
  );
}
