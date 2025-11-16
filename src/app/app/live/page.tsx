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
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>
          My 1:1 Sessions
        </h1>
        <p style={{ color: '#718096' }}>View and manage your scheduled private sessions</p>
      </div>

      {/* Instant Meeting section hidden for now - not needed for scheduled 1-on-1 sessions */}
      {/*
      <div style={{ ... }}>
        Join Instant Meeting section
      </div>
      */}

      <StudentLiveSessions />
    </div>
  );
}
