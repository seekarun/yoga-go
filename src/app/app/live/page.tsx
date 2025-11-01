'use client';

import StudentLiveSessions from '@/components/StudentLiveSessions';

export default function StudentLiveSessionsPage() {
  return (
    <div style={{ maxWidth: '1200px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>Live Sessions</h1>
        <p style={{ color: '#718096' }}>Join live video sessions with your favorite yoga experts</p>
      </div>

      <StudentLiveSessions />
    </div>
  );
}
