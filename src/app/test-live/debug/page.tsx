'use client';

import { useEffect, useState } from 'react';

export default function DebugAuthPage() {
  const [authData, setAuthData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuthData();
  }, []);

  const fetchAuthData = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success) {
        setAuthData(data.data);
      } else {
        setError(data.error || 'Not authenticated');
      }
    } catch (err) {
      setError('Failed to fetch auth data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '16px' }}>
        🔍 Authentication Debug
      </h1>
      <p style={{ color: '#718096', marginBottom: '32px' }}>
        Check your authentication status and user details
      </p>

      {error ? (
        <div
          style={{
            padding: '24px',
            background: '#fed7d7',
            border: '1px solid #fc8181',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px', color: '#c53030' }}
          >
            ❌ Not Authenticated
          </h2>
          <p style={{ marginBottom: '16px', color: '#742a2a' }}>{error}</p>
          <a
            href="/api/auth/login"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              background: '#3182ce',
              color: '#fff',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            Login with Auth0
          </a>
        </div>
      ) : (
        <>
          {/* User Info */}
          <div
            style={{
              background: '#fff',
              padding: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              👤 User Information
            </h2>
            <div style={{ display: 'grid', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  User ID
                </label>
                <div
                  style={{
                    padding: '8px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontFamily: 'monospace',
                    fontSize: '14px',
                  }}
                >
                  {authData?.id || 'N/A'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Name
                </label>
                <div
                  style={{
                    padding: '8px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  {authData?.profile?.name || 'N/A'}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                  Email
                </label>
                <div
                  style={{
                    padding: '8px',
                    background: '#f7fafc',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  {authData?.profile?.email || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Role Check */}
          <div
            style={{
              background: authData?.role === 'expert' ? '#d4edda' : '#fff3cd',
              padding: '24px',
              borderRadius: '12px',
              border: `2px solid ${authData?.role === 'expert' ? '#28a745' : '#ffc107'}`,
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
              🎭 User Role
            </h2>
            <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
              {authData?.role === 'expert' ? '✅ EXPERT' : '❌ NOT EXPERT'}
            </div>
            <div style={{ fontSize: '14px', color: '#4a5568' }}>
              Current role: <strong>{authData?.role || 'No role set'}</strong>
            </div>

            {authData?.role !== 'expert' && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '8px',
                }}
              >
                <strong>⚠️ Issue:</strong> Your user role is not "expert". You need to be an expert
                to create live sessions.
              </div>
            )}
          </div>

          {/* Expert Profile Check */}
          {authData?.role === 'expert' && (
            <div
              style={{
                background: authData?.expertProfile ? '#d4edda' : '#fff3cd',
                padding: '24px',
                borderRadius: '12px',
                border: `2px solid ${authData?.expertProfile ? '#28a745' : '#ffc107'}`,
                marginBottom: '24px',
              }}
            >
              <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
                👨‍🏫 Expert Profile
              </h2>
              <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>
                {authData?.expertProfile ? '✅ LINKED' : '❌ NOT LINKED'}
              </div>
              {authData?.expertProfile ? (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#718096' }}>
                    Expert Profile ID
                  </label>
                  <div
                    style={{
                      padding: '8px',
                      background: 'rgba(255,255,255,0.5)',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                      fontSize: '14px',
                    }}
                  >
                    {authData.expertProfile}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    marginTop: '16px',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.5)',
                    borderRadius: '8px',
                  }}
                >
                  <strong>⚠️ Issue:</strong> Your user account is an expert but has no expertProfile
                  ID linked.
                </div>
              )}
            </div>
          )}

          {/* Raw Data */}
          <details
            style={{
              background: '#1a202c',
              padding: '24px',
              borderRadius: '12px',
              color: '#fff',
            }}
          >
            <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '16px' }}>
              📋 Raw User Data (Click to expand)
            </summary>
            <pre
              style={{
                background: '#000',
                padding: '16px',
                borderRadius: '8px',
                overflow: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {JSON.stringify(authData, null, 2)}
            </pre>
          </details>

          {/* Action Steps */}
          <div
            style={{
              marginTop: '32px',
              padding: '24px',
              background: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: '12px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px' }}>
              🔧 Next Steps
            </h3>

            {!authData?.role || authData?.role !== 'expert' ? (
              <div>
                <p style={{ marginBottom: '12px' }}>
                  <strong>1. Update your user role to "expert"</strong>
                </p>
                <p style={{ marginBottom: '12px', fontSize: '14px' }}>Open MongoDB and run:</p>
                <pre
                  style={{
                    background: '#000',
                    color: '#0f0',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {`db.users.updateOne(
  { _id: "${authData?.id}" },
  { $set: { role: "expert" } }
)`}
                </pre>
              </div>
            ) : !authData?.expertProfile ? (
              <div>
                <p style={{ marginBottom: '12px' }}>
                  <strong>1. Link your user to an expert profile</strong>
                </p>
                <p style={{ marginBottom: '12px', fontSize: '14px' }}>
                  You need to create or link an expert profile. Run:
                </p>
                <pre
                  style={{
                    background: '#000',
                    color: '#0f0',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {`// First, find or create an expert
db.experts.findOne({ userId: "${authData?.id}" })

// If no expert exists, create one or link to existing:
db.users.updateOne(
  { _id: "${authData?.id}" },
  { $set: { expertProfile: "YOUR_EXPERT_ID" } }
)`}
                </pre>
              </div>
            ) : (
              <div>
                <p style={{ marginBottom: '12px' }}>
                  <strong>✅ User is configured as expert!</strong>
                </p>
                <p style={{ marginBottom: '12px', fontSize: '14px' }}>
                  Now enable live streaming for your expert profile:
                </p>
                <pre
                  style={{
                    background: '#000',
                    color: '#0f0',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {`db.experts.updateOne(
  { _id: "${authData?.expertProfile}" },
  {
    $set: {
      liveStreamingEnabled: true,
      totalLiveSessions: 0,
      upcomingLiveSessions: 0
    }
  }
)`}
                </pre>
                <div style={{ marginTop: '16px' }}>
                  <a
                    href="/test-live"
                    style={{
                      display: 'inline-block',
                      padding: '12px 24px',
                      background: '#48bb78',
                      color: '#fff',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      fontWeight: '600',
                    }}
                  >
                    Go to Test Page →
                  </a>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
