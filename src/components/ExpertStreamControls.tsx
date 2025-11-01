'use client';

import { useState } from 'react';
import type { LiveSession } from '@/types';

interface ExpertStreamControlsProps {
  session: LiveSession;
  onStart: () => void;
  onEnd: () => void;
}

export default function ExpertStreamControls({
  session,
  onStart,
  onEnd,
}: ExpertStreamControlsProps) {
  const [showStreamKey, setShowStreamKey] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const isLive = session.status === 'live';
  const isScheduled = session.status === 'scheduled';

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      {/* Session Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: '600',
            color: '#2d3748',
          }}
        >
          Stream Controls
        </h2>

        {isLive && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: '#f56565',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#fff',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#fff',
                animation: 'pulse 2s infinite',
              }}
            />
            LIVE NOW
          </div>
        )}
      </div>

      {/* Session Info */}
      <div
        style={{
          background: '#f7fafc',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3
          style={{
            margin: '0 0 12px 0',
            fontSize: '16px',
            fontWeight: '600',
            color: '#2d3748',
          }}
        >
          {session.title}
        </h3>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            fontSize: '14px',
            color: '#718096',
          }}
        >
          <div>📅 {new Date(session.scheduledStartTime).toLocaleString()}</div>
          <div>
            👥 {session.enrolledCount} enrolled
            {session.currentViewers !== undefined && isLive && (
              <> • {session.currentViewers} watching</>
            )}
          </div>
        </div>
      </div>

      {/* Streaming Instructions */}
      {isLive && session.hmsDetails && (
        <div
          style={{
            marginBottom: '24px',
          }}
        >
          <h3
            style={{
              margin: '0 0 16px 0',
              fontSize: '16px',
              fontWeight: '600',
              color: '#2d3748',
            }}
          >
            Streaming Details
          </h3>

          {/* Ingest Endpoint */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#4a5568',
              }}
            >
              Ingest Server URL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={session.hmsDetails?.roomCode || 'Room code will appear here'}
                readOnly
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  background: '#f7fafc',
                }}
              />
              <button
                onClick={() => copyToClipboard(session.hmsDetails?.roomCode || '', 'ingest')}
                style={{
                  padding: '10px 16px',
                  background: copied === 'ingest' ? '#48bb78' : '#edf2f7',
                  color: copied === 'ingest' ? '#fff' : '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied === 'ingest' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Stream Key */}
          <div style={{ marginBottom: '16px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#4a5568',
              }}
            >
              Stream Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type={showStreamKey ? 'text' : 'password'}
                value={session.hmsDetails?.roomId || 'Room ID will appear here'}
                readOnly
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  background: '#f7fafc',
                }}
              />
              <button
                onClick={() => setShowStreamKey(!showStreamKey)}
                style={{
                  padding: '10px 16px',
                  background: '#edf2f7',
                  color: '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                {showStreamKey ? '🙈 Hide' : '👁️ Show'}
              </button>
              <button
                onClick={() => copyToClipboard(session.hmsDetails?.roomId || '', 'streamKey')}
                style={{
                  padding: '10px 16px',
                  background: copied === 'streamKey' ? '#48bb78' : '#edf2f7',
                  color: copied === 'streamKey' ? '#fff' : '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied === 'streamKey' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Playback URL */}
          <div style={{ marginBottom: '24px' }}>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '600',
                color: '#4a5568',
              }}
            >
              Playback URL (for testing)
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111'}/app/live/join/${session.id}`}
                readOnly
                style={{
                  flex: 1,
                  padding: '10px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  background: '#f7fafc',
                }}
              />
              <button
                onClick={() =>
                  copyToClipboard(
                    `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3111'}/app/live/join/${session.id}`,
                    'playback'
                  )
                }
                style={{
                  padding: '10px 16px',
                  background: copied === 'playback' ? '#48bb78' : '#edf2f7',
                  color: copied === 'playback' ? '#fff' : '#4a5568',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {copied === 'playback' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* OBS Instructions */}
          <div
            style={{
              padding: '16px',
              background: '#edf2f7',
              borderRadius: '8px',
              marginBottom: '24px',
            }}
          >
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '14px',
                fontWeight: '600',
                color: '#2d3748',
              }}
            >
              How to stream with OBS Studio
            </h4>
            <ol
              style={{
                margin: 0,
                paddingLeft: '20px',
                fontSize: '13px',
                color: '#4a5568',
                lineHeight: '1.8',
              }}
            >
              <li>Open OBS Studio</li>
              <li>Go to Settings → Stream</li>
              <li>Select "Custom..." as Service</li>
              <li>Paste the Ingest Server URL above</li>
              <li>Paste the Stream Key above</li>
              <li>Click "Start Streaming" in OBS</li>
            </ol>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px' }}>
        {isScheduled && (
          <button
            onClick={onStart}
            style={{
              flex: 1,
              padding: '14px',
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            🚀 Start Session
          </button>
        )}

        {isLive && (
          <>
            <button
              onClick={() => window.open(`/app/live/${session.id}`, '_blank')}
              style={{
                flex: 1,
                padding: '14px',
                background: '#edf2f7',
                color: '#2d3748',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              👁️ Preview Stream
            </button>

            <button
              onClick={onEnd}
              style={{
                flex: 1,
                padding: '14px',
                background: 'linear-gradient(135deg, #f56565 0%, #e53e3e 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ⏹️ End Session
            </button>
          </>
        )}
      </div>

      {/* Warning for scheduled sessions */}
      {isScheduled && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: '#fef5e7',
            border: '1px solid #f6e05e',
            borderRadius: '8px',
            fontSize: '13px',
            color: '#744210',
          }}
        >
          ℹ️ When you start the session, streaming credentials will be generated. You'll need to use
          OBS Studio or similar software to broadcast.
        </div>
      )}

      {/* Pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
}
