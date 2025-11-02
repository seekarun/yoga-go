'use client';

import { useEffect, useState, useRef } from 'react';
import {
  selectIsConnectedToRoom,
  selectPeers,
  selectLocalPeer,
  useHMSActions,
  useHMSStore,
  selectIsLocalAudioEnabled,
  selectIsLocalVideoEnabled,
  useVideo,
} from '@100mslive/react-sdk';

interface ExpertVideoRoomProps {
  authToken: string;
  sessionId: string;
  onLeave: () => void;
}

export default function ExpertVideoRoom({ authToken, sessionId, onLeave }: ExpertVideoRoomProps) {
  const hmsActions = useHMSActions();
  const isConnected = useHMSStore(selectIsConnectedToRoom);
  const peers = useHMSStore(selectPeers);
  const localPeer = useHMSStore(selectLocalPeer);
  const isLocalAudioEnabled = useHMSStore(selectIsLocalAudioEnabled);
  const isLocalVideoEnabled = useHMSStore(selectIsLocalVideoEnabled);

  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const joinRoom = async () => {
      if (isJoining || isConnected) return;

      setIsJoining(true);
      try {
        console.log('[DBG][ExpertVideoRoom] Joining room with token');
        await hmsActions.join({
          userName: localPeer?.name || 'Expert',
          authToken: authToken,
          settings: {
            isAudioMuted: false, // Start with audio enabled
            isVideoMuted: false, // Start with video enabled
          },
        });
        console.log('[DBG][ExpertVideoRoom] Successfully joined room');
      } catch (err: any) {
        console.error('[DBG][ExpertVideoRoom] Error joining room:', err);
        setError(err?.message || 'Failed to join room');
      } finally {
        setIsJoining(false);
      }
    };

    joinRoom();

    // Cleanup on unmount
    return () => {
      if (isConnected) {
        hmsActions.leave();
      }
    };
  }, [authToken, hmsActions, isConnected, isJoining, localPeer?.name]);

  const toggleAudio = async () => {
    console.log(
      '[DBG][ExpertVideoRoom] Toggling audio from',
      isLocalAudioEnabled,
      'to',
      !isLocalAudioEnabled
    );
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  const toggleVideo = async () => {
    console.log(
      '[DBG][ExpertVideoRoom] Toggling video from',
      isLocalVideoEnabled,
      'to',
      !isLocalVideoEnabled
    );
    await hmsActions.setLocalVideoEnabled(!isLocalVideoEnabled);
  };

  const leaveRoom = async () => {
    await hmsActions.leave();
    onLeave();
  };

  if (error) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ color: '#e53e3e', marginBottom: '16px' }}>❌ Error</h2>
        <p style={{ marginBottom: '24px' }}>{error}</p>
        <button
          onClick={onLeave}
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
          Go Back
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '16px' }}>Joining video session...</h2>
        <div style={{ fontSize: '48px' }}>🔄</div>
      </div>
    );
  }

  // Filter students (peers who are not the local peer)
  const students = peers.filter(peer => peer.id !== localPeer?.id);

  return (
    <div
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#1a202c' }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 24px',
          background: '#2d3748',
          borderBottom: '1px solid #4a5568',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px', fontWeight: '600' }}>
            Live Yoga Session
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#a0aec0', fontSize: '14px' }}>
            {students.length} {students.length === 1 ? 'student' : 'students'} joined
          </p>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={toggleAudio}
            style={{
              padding: '12px 20px',
              background: isLocalAudioEnabled ? '#48bb78' : '#e53e3e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            {isLocalAudioEnabled ? '🎤 Mic On' : '🎤 Mic Off'}
          </button>

          <button
            onClick={toggleVideo}
            style={{
              padding: '12px 20px',
              background: isLocalVideoEnabled ? '#48bb78' : '#e53e3e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            {isLocalVideoEnabled ? '📹 Camera On' : '📹 Camera Off'}
          </button>

          <button
            onClick={leaveRoom}
            style={{
              padding: '12px 20px',
              background: '#e53e3e',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            🚪 End Session
          </button>
        </div>
      </div>

      {/* Video Grid */}
      <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              students.length === 0 ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px',
            maxWidth: '1400px',
            margin: '0 auto',
          }}
        >
          {/* Expert Video (You) */}
          <VideoTile peer={localPeer} isLocal={true} />

          {/* Student Videos */}
          {students.map(peer => (
            <VideoTile key={peer.id} peer={peer} isLocal={false} />
          ))}
        </div>

        {students.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '40px', color: '#a0aec0' }}>
            <p style={{ fontSize: '18px' }}>Waiting for students to join...</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              Share the session link with your students
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Video Tile Component
function VideoTile({ peer, isLocal }: { peer: any; isLocal: boolean }) {
  const { videoRef } = useVideo({
    trackId: peer?.videoTrack,
  });

  // Add audio rendering for remote peers
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current && peer?.audioTrack && !isLocal) {
      const audioTrack = peer.audioTrack;
      if (audioTrack) {
        const stream = new MediaStream([audioTrack]);
        audioRef.current.srcObject = stream;
        audioRef.current.play().catch(err => {
          console.error('[DBG][VideoTile] Error playing audio:', err);
        });
      }
    }
  }, [peer?.audioTrack, isLocal]);

  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: '16/9',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        border: isLocal ? '3px solid #48bb78' : '1px solid #4a5568',
      }}
    >
      {peer?.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          muted={isLocal}
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
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
            background: '#2d3748',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>👤</div>
            <div style={{ color: '#a0aec0', fontSize: '14px' }}>Camera Off</div>
          </div>
        </div>
      )}

      {/* Audio element for remote peers (hidden but playing) */}
      {!isLocal && peer?.audioTrack && <audio ref={audioRef} autoPlay playsInline />}

      {/* Name Tag */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          padding: '6px 12px',
          background: 'rgba(0, 0, 0, 0.7)',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        {peer?.name || 'Anonymous'} {isLocal && '(You)'}
      </div>

      {/* Audio Indicator */}
      {peer?.audioTrack && !peer?.isAudioEnabled && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '6px',
            background: 'rgba(229, 62, 62, 0.9)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          🔇
        </div>
      )}
    </div>
  );
}
