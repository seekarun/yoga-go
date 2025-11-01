'use client';

import { useState, useEffect } from 'react';

export default function TestLivePage() {
  const [sessionId, setSessionId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [sessionUrl, setSessionUrl] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const createSession = async () => {
    try {
      addLog('Creating session...');
      const response = await fetch('/api/live/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Test Live Session',
          description: 'Testing 100ms video integration',
          sessionType: 'group',
          scheduledStartTime: new Date(Date.now() + 60000).toISOString(),
          scheduledEndTime: new Date(Date.now() + 3660000).toISOString(),
          price: 0,
          maxParticipants: 50,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSessionId(data.data.session.id);
        addLog(`✅ Session created: ${data.data.session.id}`);
        addLog(`Status: ${data.data.session.status}`);
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const startSession = async () => {
    if (!sessionId) {
      addLog('❌ No session ID. Create a session first!');
      return;
    }

    try {
      addLog('Starting session and creating 100ms room...');
      const response = await fetch(`/api/live/sessions/${sessionId}/start`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        setRoomId(data.data.roomId);
        setRoomCode(data.data.roomCode);
        setSessionUrl(data.data.sessionUrl);
        addLog('✅ Session started!');
        addLog('✅ 100ms room created!');
        addLog(`Room ID: ${data.data.roomId}`);
        addLog(`Session URL: ${data.data.sessionUrl}`);
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const endSession = async () => {
    if (!sessionId) {
      addLog('❌ No session ID. Create a session first!');
      return;
    }

    try {
      addLog('Ending session...');
      const response = await fetch(`/api/live/sessions/${sessionId}/end`, {
        method: 'POST',
      });

      const data = await response.json();
      if (data.success) {
        addLog(`✅ Session ended. Duration: ${data.data.duration} minutes`);
      } else {
        addLog(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>
        Live Streaming Test Page
      </h1>
      <p style={{ color: '#718096', marginBottom: '32px' }}>Test your 100ms video integration</p>

      {/* Control Buttons */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <button
          onClick={createSession}
          style={{
            padding: '12px 24px',
            background: '#48bb78',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          1. Create Session
        </button>

        <button
          onClick={startSession}
          disabled={!sessionId}
          style={{
            padding: '12px 24px',
            background: sessionId ? '#667eea' : '#cbd5e0',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: sessionId ? 'pointer' : 'not-allowed',
          }}
        >
          2. Start Session (Create 100ms Room)
        </button>

        <button
          onClick={endSession}
          disabled={!sessionId}
          style={{
            padding: '12px 24px',
            background: sessionId ? '#f56565' : '#cbd5e0',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            cursor: sessionId ? 'pointer' : 'not-allowed',
          }}
        >
          3. End Session
        </button>
      </div>

      {/* Results */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Stream Details */}
        <div
          style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Stream Details
          </h2>

          {sessionId && (
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#718096',
                  marginBottom: '4px',
                }}
              >
                Session ID
              </label>
              <code
                style={{
                  display: 'block',
                  padding: '8px',
                  background: '#f7fafc',
                  borderRadius: '4px',
                  fontSize: '12px',
                }}
              >
                {sessionId}
              </code>
            </div>
          )}

          {roomId && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#718096',
                    marginBottom: '4px',
                  }}
                >
                  Room ID
                </label>
                <code
                  style={{
                    display: 'block',
                    padding: '8px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                  }}
                >
                  {roomId}
                </code>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#718096',
                    marginBottom: '4px',
                  }}
                >
                  Room Code
                </label>
                <code
                  style={{
                    display: 'block',
                    padding: '8px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                  }}
                >
                  {roomCode}
                </code>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#718096',
                    marginBottom: '4px',
                  }}
                >
                  Expert Join URL
                </label>
                <code
                  style={{
                    display: 'block',
                    padding: '8px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontSize: '11px',
                    wordBreak: 'break-all',
                  }}
                >
                  {sessionUrl}
                </code>
              </div>

              <div
                style={{
                  padding: '16px',
                  background: '#d4edda',
                  borderRadius: '8px',
                  color: '#155724',
                  marginBottom: '16px',
                }}
              >
                <strong>✅ Success!</strong> 100ms room created!
                <br />
                <small>You can now join the video session using the buttons below.</small>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                <a
                  href={sessionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#48bb78',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  🧘 Join as Expert
                </a>
                <a
                  href={`http://localhost:3111/app/live/join/${sessionId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    textAlign: 'center',
                    textDecoration: 'none',
                    fontWeight: '600',
                    cursor: 'pointer',
                  }}
                >
                  👤 Join as Student
                </a>
              </div>
            </>
          )}
        </div>

        {/* Logs */}
        <div
          style={{
            background: '#1a202c',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px', color: '#fff' }}>
            Console Logs
          </h2>
          <div
            style={{
              background: '#000',
              padding: '16px',
              borderRadius: '8px',
              height: '400px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#00ff00',
            }}
          >
            {logs.length === 0 ? (
              <div style={{ color: '#718096' }}>Waiting for actions...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} style={{ marginBottom: '4px' }}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div
        style={{
          marginTop: '32px',
          padding: '24px',
          background: '#fff3cd',
          border: '1px solid #ffc107',
          borderRadius: '8px',
        }}
      >
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
          📝 Quick Test Guide
        </h3>
        <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
          <li>
            Click <strong>"1. Create Session"</strong> to create a test session in MongoDB
          </li>
          <li>
            Click <strong>"2. Start Session"</strong> to create 100ms video room
          </li>
          <li>
            Click <strong>"🧘 Join as Expert"</strong> to open the expert video interface in a new
            tab
          </li>
          <li>
            Click <strong>"👤 Join as Student"</strong> in another tab/window to simulate a student
            joining
          </li>
          <li>Both will join the same video room and can see/hear each other!</li>
          <li>Test camera/mic controls, try with multiple student tabs to see the grid view</li>
          <li>
            When done, click <strong>"🚪 End Session"</strong> in the expert view
          </li>
          <li>
            Then click <strong>"3. End Session"</strong> on this test page to clean up
          </li>
        </ol>

        <div
          style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(255,255,255,0.7)',
            borderRadius: '4px',
          }}
        >
          <strong>✨ New!</strong> Browser-based video calls - no OBS or software downloads needed!
        </div>
      </div>
    </div>
  );
}
