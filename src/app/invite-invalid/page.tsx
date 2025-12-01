'use client';

import Link from 'next/link';

export default function InviteInvalidPage() {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      <section style={{ padding: '120px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Error Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              background: '#ef4444',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
            }}
          >
            <svg width="48" height="48" fill="#fff" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>

          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#333',
            }}
          >
            Invalid or Expired Invite
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: '#666',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}
          >
            This expert invite link is invalid, has already been used, or has expired. Expert
            invites are one-time use only and expire after 7 days.
          </p>

          <div
            style={{
              background: '#fff',
              padding: '32px',
              borderRadius: '12px',
              marginBottom: '32px',
              textAlign: 'left',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '20px',
                fontWeight: '600',
                marginBottom: '16px',
                color: '#333',
              }}
            >
              Common Reasons
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="20"
                  height="20"
                  fill="#ef4444"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0, marginTop: '2px' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#666' }}>
                  The invite has already been used to create an account
                </span>
              </li>
              <li style={{ marginBottom: '12px', display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="20"
                  height="20"
                  fill="#ef4444"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0, marginTop: '2px' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#666' }}>
                  The invite link expired (valid for 7 days only)
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="20"
                  height="20"
                  fill="#ef4444"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0, marginTop: '2px' }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#666' }}>
                  The invite was revoked by an administrator
                </span>
              </li>
            </ul>
          </div>

          <div
            style={{
              background: '#fef3c7',
              border: '1px solid #fbbf24',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '32px',
              textAlign: 'left',
            }}
          >
            <p style={{ fontSize: '14px', color: '#92400e', margin: 0 }}>
              <strong>Need a new invite?</strong> Please contact the person who sent you the
              original invite link and request a new one.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/"
              style={{
                padding: '14px 32px',
                background: '#764ba2',
                color: '#fff',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Return to Home
            </Link>
            <Link
              href="/srv"
              style={{
                padding: '14px 32px',
                background: 'transparent',
                color: '#764ba2',
                border: '2px solid #764ba2',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#f8f8f8';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Learn About Teaching
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
