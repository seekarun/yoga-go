'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StudentLiveSessions from '@/components/StudentLiveSessions';

export default function StudentLiveSessionsPage() {
  const router = useRouter();
  const [meetingCode, setMeetingCode] = useState('');

  const handleJoinByCode = () => {
    if (!meetingCode.trim()) {
      alert('Please enter a meeting code');
      return;
    }
    router.push(`/app/live/instant/${meetingCode.trim().toUpperCase()}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleJoinByCode();
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '104px 20px 40px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Live Sessions</h1>
        <p style={{ color: '#718096' }}>Join live video sessions with your favorite yoga experts</p>
      </div>

      {/* Join with Code Section */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚡</div>
            <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>
              Join Instant Meeting
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
              Enter the meeting code shared by your instructor
            </p>
          </div>

          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'stretch',
            }}
          >
            <input
              type="text"
              value={meetingCode}
              onChange={e => setMeetingCode(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter meeting code (e.g., ABC12345)"
              style={{
                flex: 1,
                padding: '16px',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '1px',
                textAlign: 'center',
                fontFamily: 'monospace',
              }}
            />
            <button
              onClick={handleJoinByCode}
              style={{
                padding: '16px 32px',
                background: '#10b981',
                border: 'none',
                color: '#fff',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)',
              }}
            >
              Join Now
            </button>
          </div>
        </div>
      </div>

      <StudentLiveSessions />
    </div>
  );
}
