'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading user data...</div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <Link
              href="/app"
              style={{
                color: 'var(--color-primary)',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
              }}
            >
              ← Back to Dashboard
            </Link>
          </div>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            My Profile
          </h1>
          <p style={{ fontSize: '14px', color: '#666' }}>Your account information</p>
        </div>
      </div>

      {/* Profile Content */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Profile Card */}
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {/* Avatar Section */}
          <div
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: user.profile.avatar ? `url(${user.profile.avatar})` : '#fff',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#764ba2',
                margin: '0 auto',
                border: '3px solid rgba(255,255,255,0.3)',
              }}
            >
              {!user.profile.avatar && user.profile.name.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Details Section */}
          <div style={{ padding: '24px' }}>
            {/* Name */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Full Name
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  border: '1px solid #e9ecef',
                }}
              >
                {user.profile.name}
              </div>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Email Address
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  border: '1px solid #e9ecef',
                }}
              >
                {user.profile.email}
              </div>
            </div>

            {/* Phone */}
            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Phone Number
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: user.profile.phoneNumber ? '#333' : '#999',
                  border: '1px solid #e9ecef',
                }}
              >
                {user.profile.phoneNumber || 'Not provided'}
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label
                style={{
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Member Since
              </label>
              <div
                style={{
                  padding: '14px 16px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  fontSize: '15px',
                  color: '#333',
                  border: '1px solid #e9ecef',
                }}
              >
                {formatDate(user.profile.joinedAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
