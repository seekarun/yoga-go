'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ExpertLiveSessions from '@/components/ExpertLiveSessions';
import type { User } from '@/types';

export default function ExpertLiveDashboard({ params }: { params: Promise<{ expertId: string }> }) {
  const { expertId } = use(params);
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [showInstantModal, setShowInstantModal] = useState(false);
  const [instantTitle, setInstantTitle] = useState('');
  const [instantDescription, setInstantDescription] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingPlatform, setMeetingPlatform] = useState<'zoom' | 'google-meet'>('google-meet');
  const [creatingMeeting, setCreatingMeeting] = useState(false);
  const [meetingCreated, setMeetingCreated] = useState<{
    sessionId: string;
    roomCode: string;
    joinUrl: string;
    meetingLink: string;
    meetingPlatform: string;
  } | null>(null);

  // Check authorization first
  useEffect(() => {
    checkAuthorization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const handleCreateInstantMeeting = async () => {
    if (!meetingLink.trim()) {
      alert('Please provide a meeting link (Zoom, Google Meet, etc.)');
      return;
    }

    setCreatingMeeting(true);
    try {
      console.log('[DBG][live-dashboard] Creating instant meeting');
      const response = await fetch('/api/live/sessions/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: instantTitle || 'Instant Meeting',
          description: instantDescription || 'Join this instant meeting',
          meetingLink: meetingLink.trim(),
          meetingPlatform,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        alert('Failed to create instant meeting: ' + data.error);
        return;
      }

      console.log('[DBG][live-dashboard] Instant meeting created:', data.data);
      setMeetingCreated(data.data);
    } catch (err) {
      console.error('[DBG][live-dashboard] Error creating instant meeting:', err);
      alert('Failed to create instant meeting');
    } finally {
      setCreatingMeeting(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleCloseModal = () => {
    setShowInstantModal(false);
    setInstantTitle('');
    setInstantDescription('');
    setMeetingLink('');
    setMeetingPlatform('google-meet');
    setMeetingCreated(null);
  };

  const handleJoinMeeting = () => {
    if (meetingCreated?.meetingLink) {
      // Open the meeting link in a new tab
      window.open(meetingCreated.meetingLink, '_blank', 'noopener,noreferrer');
    }
  };

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
    <>
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
              onClick={() => setShowInstantModal(true)}
              style={{
                padding: '12px 24px',
                background: '#10b981',
                border: 'none',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              ⚡ Start Instant Meeting
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

      {/* Instant Meeting Modal */}
      {showInstantModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={handleCloseModal}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              maxWidth: '600px',
              width: '100%',
              padding: '32px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {!meetingCreated ? (
              <>
                <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                  Start Instant Meeting
                </h2>
                <p style={{ color: '#718096', marginBottom: '24px' }}>
                  Create a quick meeting and share the code with participants
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Meeting Title
                  </label>
                  <input
                    type="text"
                    value={instantTitle}
                    onChange={e => setInstantTitle(e.target.value)}
                    placeholder="Quick Yoga Session"
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Description
                  </label>
                  <textarea
                    value={instantDescription}
                    onChange={e => setInstantDescription(e.target.value)}
                    placeholder="Join this quick yoga practice session"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Platform
                  </label>
                  <select
                    value={meetingPlatform}
                    onChange={e => setMeetingPlatform(e.target.value as 'zoom' | 'google-meet')}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '16px',
                      background: '#fff',
                    }}
                  >
                    <option value="google-meet">Google Meet</option>
                    <option value="zoom">Zoom</option>
                  </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      marginBottom: '8px',
                    }}
                  >
                    Meeting Link <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="url"
                    value={meetingLink}
                    onChange={e => setMeetingLink(e.target.value)}
                    placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '16px',
                    }}
                    required
                  />
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                    Paste your Zoom, Google Meet, or other video meeting link
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      padding: '12px 24px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateInstantMeeting}
                    disabled={creatingMeeting || !meetingLink.trim()}
                    style={{
                      padding: '12px 24px',
                      background: creatingMeeting || !meetingLink.trim() ? '#9ca3af' : '#10b981',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: creatingMeeting || !meetingLink.trim() ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {creatingMeeting ? 'Creating...' : 'Create Meeting'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>✅</div>
                  <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                    Meeting Created!
                  </h2>
                  <p style={{ color: '#718096' }}>Share the code or link below with participants</p>
                </div>

                <div
                  style={{
                    background: '#f0fdf4',
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ fontSize: '14px', color: '#047857', marginBottom: '8px' }}>
                    Meeting Code
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        letterSpacing: '4px',
                      }}
                    >
                      {meetingCreated.roomCode}
                    </span>
                    <button
                      onClick={() => handleCopyToClipboard(meetingCreated.roomCode)}
                      style={{
                        padding: '8px 16px',
                        background: '#10b981',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    background: '#f9fafb',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      marginBottom: '8px',
                      fontWeight: '600',
                    }}
                  >
                    Shareable Link
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="text"
                      value={meetingCreated.joinUrl}
                      readOnly
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontFamily: 'monospace',
                      }}
                    />
                    <button
                      onClick={() => handleCopyToClipboard(meetingCreated.joinUrl)}
                      style={{
                        padding: '10px 16px',
                        background: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleCloseModal}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: '#f3f4f6',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={handleJoinMeeting}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      background: '#10b981',
                      border: 'none',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                    }}
                  >
                    Join Meeting
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
