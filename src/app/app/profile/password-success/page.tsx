'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Password Change Success Redirect Page
 *
 * This page is used as the result_url for Auth0 password change tickets.
 * It immediately redirects users back to their profile page with a success message.
 */
export default function PasswordChangeSuccess() {
  const router = useRouter();

  useEffect(() => {
    console.log('[DBG][password-success] Redirecting to profile page');

    // Redirect immediately to profile page with success flag
    const timer = setTimeout(() => {
      router.push('/app/profile?password_changed=true');
    }, 100);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#f8f8f8',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          maxWidth: '400px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 24px',
          }}
        >
          <span style={{ fontSize: '32px', color: '#fff' }}>✓</span>
        </div>

        <h1
          style={{
            fontSize: '24px',
            fontWeight: '600',
            marginBottom: '12px',
            color: '#2d3748',
          }}
        >
          Password Changed!
        </h1>

        <p
          style={{
            fontSize: '16px',
            color: '#718096',
            marginBottom: '24px',
          }}
        >
          Your password has been updated successfully.
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: '#667eea',
            fontSize: '14px',
          }}
        >
          <div
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid #667eea',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
            }}
          />
          Redirecting to your profile...
        </div>

        <p
          style={{
            marginTop: '24px',
            fontSize: '14px',
            color: '#a0aec0',
          }}
        >
          If you are not redirected automatically,{' '}
          <a
            href="/app/profile?password_changed=true"
            style={{
              color: '#667eea',
              textDecoration: 'underline',
            }}
          >
            click here
          </a>
          .
        </p>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
