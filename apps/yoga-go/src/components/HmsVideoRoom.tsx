'use client';

/**
 * HmsVideoRoom Component
 *
 * Video conferencing room using 100ms SDK
 * Handles video/audio toggle, peer grid, and leave functionality
 */

import { useEffect, useState } from 'react';
import {
  useHMSActions,
  useHMSStore,
  selectIsConnectedToRoom,
  selectLocalPeer,
  selectPeers,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  selectHMSMessages,
  selectRoomState,
  HMSRoomState,
} from '@100mslive/react-sdk';

interface HmsVideoRoomProps {
  authToken: string;
  userName: string;
  onLeave?: () => void;
}

export default function HmsVideoRoom({ authToken, userName, onLeave }: HmsVideoRoomProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const localPeer = useHMSStore(selectLocalPeer);
  const peers = useHMSStore(selectPeers);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);
  const messages = useHMSStore(selectHMSMessages);
  const roomState = useHMSStore(selectRoomState);

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Join room on mount
  useEffect(() => {
    const joinRoom = async () => {
      console.log('[DBG][HmsVideoRoom] Joining room...');
      setIsJoining(true);
      setError(null);

      try {
        await hmsActions.join({
          authToken,
          userName,
          settings: {
            isAudioMuted: false,
            isVideoMuted: false,
          },
        });
        console.log('[DBG][HmsVideoRoom] Joined room successfully');
      } catch (err) {
        console.error('[DBG][HmsVideoRoom] Failed to join room:', err);
        setError(err instanceof Error ? err.message : 'Failed to join room');
      } finally {
        setIsJoining(false);
      }
    };

    if (authToken && !isConnected && roomState === HMSRoomState.Disconnected) {
      joinRoom();
    }

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        console.log('[DBG][HmsVideoRoom] Leaving room on unmount');
        hmsActions.leave();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, userName]);

  const handleLeave = async () => {
    console.log('[DBG][HmsVideoRoom] Leaving room');
    await hmsActions.leave();
    onLeave?.();
  };

  const toggleAudio = async () => {
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  const toggleVideo = async () => {
    await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
  };

  if (isJoining) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          background: '#1a1a1a',
          borderRadius: '12px',
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
        <p style={{ color: '#fff', marginTop: '16px' }}>Joining session...</p>
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
          height: '100%',
          minHeight: '400px',
          background: '#1a1a1a',
          borderRadius: '12px',
          padding: '24px',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>Error</div>
        <p style={{ color: '#ef4444', marginBottom: '16px' }}>{error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            background: 'var(--color-primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: '400px',
          background: '#1a1a1a',
          borderRadius: '12px',
        }}
      >
        <p style={{ color: '#fff' }}>Connecting...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '500px',
        background: '#1a1a1a',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 16px',
          background: '#262626',
          borderBottom: '1px solid #333',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              background: '#22c55e',
              borderRadius: '50%',
            }}
          />
          <span style={{ color: '#fff', fontSize: '14px' }}>
            {peers.length} participant{peers.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={{ color: '#9ca3af', fontSize: '13px' }}>
          {localPeer?.roleName === 'host' ? 'Host' : 'Participant'}
        </span>
      </div>

      {/* Video Grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns:
            peers.length === 1 ? '1fr' : peers.length <= 4 ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gap: '8px',
          padding: '8px',
          overflow: 'auto',
        }}
      >
        {peers.map(peer => (
          <div
            key={peer.id}
            style={{
              position: 'relative',
              background: '#262626',
              borderRadius: '8px',
              overflow: 'hidden',
              aspectRatio: '16/9',
              minHeight: '120px',
            }}
          >
            {peer.videoTrack ? (
              <video
                autoPlay
                playsInline
                muted={peer.isLocal}
                ref={el => {
                  if (el && peer.videoTrack) {
                    hmsActions.attachVideo(peer.videoTrack, el);
                  }
                }}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  transform: peer.isLocal ? 'scaleX(-1)' : 'none',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    color: '#fff',
                    fontWeight: '600',
                  }}
                >
                  {(peer.name || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
            )}

            {/* Name badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.6)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
              }}
            >
              {peer.name || 'Unknown'} {peer.isLocal && '(You)'}
              {!peer.audioTrack && ' (muted)'}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '16px',
          padding: '16px',
          background: '#262626',
          borderTop: '1px solid #333',
        }}
      >
        <button
          onClick={toggleAudio}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: isLocalAudioEnabled ? '#374151' : '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isLocalAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isLocalAudioEnabled ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c-.49 0-.9.36-.98.85C16.52 14.2 14.47 16 12 16s-4.52-1.8-4.93-4.15c-.08-.49-.49-.85-.98-.85-.61 0-1.09.54-1 1.14.49 3 2.89 5.35 5.91 5.78V20c0 .55.45 1 1 1s1-.45 1-1v-2.08c3.02-.43 5.42-2.78 5.91-5.78.1-.6-.39-1.14-1-1.14z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V20c0 .55.45 1 1 1s1-.45 1-1v-2.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleVideo}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: isLocalVideoEnabled ? '#374151' : '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={isLocalVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isLocalVideoEnabled ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z" />
            </svg>
          )}
        </button>

        <button
          onClick={handleLeave}
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: '#ef4444',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Leave"
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.68-1.36-2.66-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
          </svg>
        </button>
      </div>

      {/* Chat messages (simplified) */}
      {messages.length > 0 && (
        <div
          style={{
            padding: '8px 16px',
            background: '#1f1f1f',
            borderTop: '1px solid #333',
            maxHeight: '100px',
            overflow: 'auto',
          }}
        >
          {messages.slice(-3).map(msg => (
            <div key={msg.id} style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '4px' }}>
              <span style={{ color: '#fff', fontWeight: '500' }}>{msg.senderName}: </span>
              {msg.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
