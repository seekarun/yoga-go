'use client';

import Link from 'next/link';

export default function ConfirmationPage() {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      <section style={{ padding: '120px 20px', textAlign: 'center' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Success Icon */}
          <div
            style={{
              width: '80px',
              height: '80px',
              background: '#10b981',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 32px',
            }}
          >
            <svg width="48" height="48" fill="#fff" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
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
            Application Submitted!
          </h1>

          <p
            style={{
              fontSize: '18px',
              color: '#666',
              marginBottom: '32px',
              lineHeight: '1.6',
            }}
          >
            Thank you for your interest in teaching on MyYoga. We&apos;ve received your application
            and will review your credentials carefully.
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
              What Happens Next?
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    background: '#764ba2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  1
                </div>
                <span style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                  We&apos;ll review your application within 5 business days
                </span>
              </li>
              <li
                style={{
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    background: '#764ba2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  2
                </div>
                <span style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                  You&apos;ll receive an email from our team with next steps
                </span>
              </li>
              <li
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    background: '#764ba2',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '600',
                  }}
                >
                  3
                </div>
                <span style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                  We may reach out for a phone conversation to learn more about you
                </span>
              </li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/courses"
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
              Browse Courses
            </Link>
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
          </div>
        </div>
      </section>
    </div>
  );
}
