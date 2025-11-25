'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleResendVerification = async () => {
    setResending(true);
    setMessage(null);

    try {
      // In a production app, this would call an API endpoint to resend verification email
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('Verification email sent! Please check your inbox.');
    } catch {
      setMessage('Failed to resend verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ fontSize: '64px', marginBottom: '24px' }}>📧</div>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '700',
              marginBottom: '16px',
              lineHeight: '1.2',
            }}
          >
            Verify Your Email
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.95 }}>
            Please verify your email address to access your account
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div
            style={{
              background: '#fff',
              padding: '48px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              Check Your Email
            </h2>
            <p
              style={{
                fontSize: '16px',
                color: '#666',
                lineHeight: '1.6',
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              We&apos;ve sent a verification link to your email address. Please click the link in
              the email to verify your account and gain access to all features.
            </p>

            {message && (
              <div
                style={{
                  padding: '12px 16px',
                  background: message.includes('Failed') ? '#fee' : '#e8f5e9',
                  color: message.includes('Failed') ? '#c33' : '#2e7d32',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  fontSize: '14px',
                  textAlign: 'center',
                }}
              >
                {message}
              </div>
            )}

            <div
              style={{
                background: '#f0f4ff',
                border: '1px solid #667eea',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '24px',
              }}
            >
              <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
                What to do next:
              </h3>
              <ol
                style={{
                  fontSize: '14px',
                  color: '#4a5568',
                  paddingLeft: '20px',
                  lineHeight: '1.8',
                }}
              >
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Return to this site and log in again</li>
              </ol>
            </div>

            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <button
                onClick={handleResendVerification}
                disabled={resending}
                style={{
                  padding: '14px 32px',
                  background: resending
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: resending ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseOver={e => {
                  if (!resending) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {resending ? 'Sending...' : 'Resend Verification Email'}
              </button>
            </div>

            <div
              style={{
                paddingTop: '24px',
                borderTop: '1px solid #e2e8f0',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Already verified your email?
              </p>
              <Link
                href="/auth/login"
                style={{
                  color: '#764ba2',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Log in to your account →
              </Link>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link
                href="/auth/logout"
                style={{
                  color: '#999',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                Log out
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
