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
  selectAudioTrackByID,
} from '@100mslive/react-sdk';

interface StudentVideoRoomProps {
  authToken: string;
  sessionId: string;
  onLeave: () => void;
}

export default function StudentVideoRoom({ authToken, sessionId, onLeave }: StudentVideoRoomProps) {
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
        console.log('[DBG][StudentVideoRoom] Joining room with token');
        await hmsActions.join({
          userName: localPeer?.name || 'Student',
          authToken: authToken,
          settings: {
            isAudioMuted: false, // Start with audio enabled
            isVideoMuted: false, // Start with video enabled
          },
        });
        console.log('[DBG][StudentVideoRoom] Successfully joined room');
      } catch (err: any) {
        console.error('[DBG][StudentVideoRoom] Error joining room:', err);
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
      '[DBG][StudentVideoRoom] Toggling audio from',
      isLocalAudioEnabled,
      'to',
      !isLocalAudioEnabled
    );
    await hmsActions.setLocalAudioEnabled(!isLocalAudioEnabled);
  };

  const toggleVideo = async () => {
    console.log(
      '[DBG][StudentVideoRoom] Toggling video from',
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

  // Find the expert (host role)
  const expert = peers.find(peer => peer.roleName === 'host' || peer.roleName === 'expert');
  // Other students
  const otherStudents = peers.filter(peer => peer.id !== localPeer?.id && peer.id !== expert?.id);

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
            Yoga Session
          </h2>
          <p style={{ margin: '4px 0 0 0', color: '#a0aec0', fontSize: '14px' }}>
            {peers.length} {peers.length === 1 ? 'participant' : 'participants'}
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
            🚪 Leave
          </button>
        </div>
      </div>

      {/* Video Layout */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          gap: '16px',
          overflow: 'auto',
        }}
      >
        {/* Expert Video (Large) */}
        {expert && (
          <div style={{ flex: 2, minHeight: '400px' }}>
            <VideoTile peer={expert} isExpert={true} />
          </div>
        )}

        {/* Bottom Section: Student Videos */}
        <div style={{ flex: 1, minHeight: '200px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))`,
              gap: '12px',
              height: '100%',
            }}
          >
            {/* Your Video */}
            <VideoTile peer={localPeer} isLocal={true} />

            {/* Other Students */}
            {otherStudents.map(peer => (
              <VideoTile key={peer.id} peer={peer} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Video Tile Component
function VideoTile({
  peer,
  isLocal = false,
  isExpert = false,
}: {
  peer: any;
  isLocal?: boolean;
  isExpert?: boolean;
}) {
  const { videoRef } = useVideo({
    trackId: peer?.videoTrack,
  });

  // Get the actual audio track using HMS selector
  const audioTrack = useHMSStore(selectAudioTrackByID(peer?.audioTrack));
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const attachAudio = async () => {
      if (audioRef.current && audioTrack && !isLocal) {
        try {
          // Try to get the underlying media stream track
          const track = (audioTrack as any).track;
          if (track) {
            const stream = new MediaStream([track]);
            audioRef.current.srcObject = stream;
            await audioRef.current.play();
            console.log('[DBG][VideoTile] Audio playing for peer');
          }
        } catch (err) {
          console.error('[DBG][VideoTile] Error playing audio:', err);
        }
      }
    };

    attachAudio();
  }, [audioTrack, isLocal]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        border: isExpert
          ? '3px solid #f6ad55'
          : isLocal
            ? '3px solid #48bb78'
            : '1px solid #4a5568',
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
            <div style={{ fontSize: isExpert ? '64px' : '48px', marginBottom: '8px' }}>
              {isExpert ? '🧘' : '👤'}
            </div>
            <div style={{ color: '#a0aec0', fontSize: '14px' }}>Camera Off</div>
          </div>
        </div>
      )}

      {/* Audio element for remote peers (hidden but playing) */}
      {!isLocal && audioTrack && <audio ref={audioRef} autoPlay playsInline />}

      {/* Name Tag */}
      <div
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          padding: '6px 12px',
          background: isExpert
            ? 'rgba(246, 173, 85, 0.9)'
            : isLocal
              ? 'rgba(72, 187, 120, 0.9)'
              : 'rgba(0, 0, 0, 0.7)',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '14px',
          fontWeight: '600',
        }}
      >
        {isExpert && '🧘 '}
        {peer?.name || 'Anonymous'} {isLocal && '(You)'}
        {isExpert && ' (Instructor)'}
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
