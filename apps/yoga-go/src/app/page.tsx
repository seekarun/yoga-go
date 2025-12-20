'use client';

import Image from 'next/image';
import { useState } from 'react';

type Step = 'email' | 'verify' | 'details' | 'success';

export default function ComingSoon() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [thoughts, setThoughts] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Something went wrong');
        setLoading(false);
        return;
      }

      console.log('[DBG][page.tsx] Verification email sent');
      setStep('verify');
    } catch (err) {
      console.error('[DBG][page.tsx] Email submit error:', err);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePinVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (pin.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    // Move to details step - we'll verify PIN when submitting details
    setStep('details');
  };

  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/waitlist/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, pin, name, thoughts }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.expired) {
          setError('Verification code expired. Please start over.');
          setStep('email');
          setPin('');
        } else {
          setError(data.message || 'Something went wrong');
          if (data.message?.toLowerCase().includes('code')) {
            setStep('verify');
          }
        }
        setLoading(false);
        return;
      }

      console.log('[DBG][page.tsx] Waitlist signup complete');
      setStep('success');
    } catch (err) {
      console.error('[DBG][page.tsx] Details submit error:', err);
      setError('Failed to complete signup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setLoading(true);
    setPin('');

    try {
      const response = await fetch('/api/waitlist/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || 'Failed to resend code');
      } else {
        setError('New code sent! Check your email.');
      }
    } catch (err) {
      console.error('[DBG][page.tsx] Resend code error:', err);
      setError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Background Image */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: 'url(/landinghero1.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          zIndex: 0,
        }}
      />

      {/* Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <div style={{ marginBottom: '48px' }}>
          <Image
            src="/myg.png"
            alt="MyYoga.Guru"
            width={200}
            height={80}
            style={{ objectFit: 'contain' }}
            priority
          />
        </div>

        {step === 'success' ? (
          // Success State
          <>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '32px',
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 12l2 2 4-4"
                  stroke="var(--color-highlight)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="12" r="10" stroke="var(--color-highlight)" strokeWidth="2" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: 'clamp(28px, 6vw, 48px)',
                fontWeight: '800',
                color: '#fff',
                marginBottom: '16px',
              }}
            >
              You&apos;re on the list!
            </h1>
            <p
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.85)',
                maxWidth: '400px',
              }}
            >
              Thanks for joining, {name}! We&apos;ll keep you posted on our launch.
            </p>
          </>
        ) : (
          // Form States
          <>
            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(36px, 8vw, 64px)',
                fontWeight: '800',
                color: 'var(--color-primary)',
                marginBottom: '24px',
                letterSpacing: '-0.02em',
                lineHeight: '1.1',
              }}
            >
              Something{' '}
              <span
                style={{
                  // background: 'linear-gradient(135deg, var(--color-highlight) 0%, var(--color-primary) 100%)',
                  // WebkitBackgroundClip: 'text',
                  // WebkitTextFillColor: 'transparent',
                  color: 'var(--color-highlight)',
                }}
              >
                beautiful
              </span>
              <br />
              is on the way
            </h1>

            {/* Subheadline */}
            <p
              style={{
                fontSize: 'clamp(16px, 2.5vw, 20px)',
                lineHeight: '1.7',
                color: 'var(--color-primary)',
                marginBottom: '48px',
                maxWidth: '500px',
              }}
            >
              {step === 'email'
                ? "We're building a platform to help yoga instructors share their practice with the world. Be the first to know when we launch."
                : step === 'verify'
                  ? `We've sent a 6-digit code to ${email}. Enter it below to continue.`
                  : 'Almost there! Tell us a bit about yourself.'}
            </p>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  padding: '12px 20px',
                  background: error.includes('sent')
                    ? 'rgba(74, 222, 128, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)',
                  border: `1px solid ${error.includes('sent') ? 'rgba(74, 222, 128, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  borderRadius: '8px',
                  marginBottom: '24px',
                  maxWidth: '480px',
                  width: '100%',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: '14px',
                    color: error.includes('sent') ? '#4ade80' : '#ef4444',
                  }}
                >
                  {error}
                </p>
              </div>
            )}

            {/* Step 1: Email Input */}
            {step === 'email' && (
              <form
                onSubmit={handleEmailSubmit}
                style={{
                  display: 'flex',
                  gap: '12px',
                  flexWrap: 'wrap',
                  justifyContent: 'center',
                  maxWidth: '480px',
                  width: '100%',
                }}
              >
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                  style={{
                    flex: '1 1 250px',
                    padding: '16px 24px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1a1a1a',
                    outline: 'none',
                    opacity: loading ? 0.7 : 1,
                  }}
                />
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '16px 32px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    boxShadow:
                      '0 8px 32px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? 'Sending...' : 'Notify Me'}
                </button>
              </form>
            )}

            {/* Step 2: PIN Verification */}
            {step === 'verify' && (
              <form
                onSubmit={handlePinVerify}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  maxWidth: '320px',
                  width: '100%',
                }}
              >
                <input
                  type="text"
                  value={pin}
                  onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  required
                  maxLength={6}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    fontSize: '24px',
                    fontWeight: '600',
                    letterSpacing: '8px',
                    textAlign: 'center',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1a1a1a',
                    outline: 'none',
                    fontFamily: 'monospace',
                  }}
                />
                <button
                  type="submit"
                  disabled={pin.length !== 6}
                  style={{
                    width: '100%',
                    padding: '16px 32px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    cursor: pin.length !== 6 ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    boxShadow:
                      '0 8px 32px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                    opacity: pin.length !== 6 ? 0.5 : 1,
                  }}
                >
                  Verify
                </button>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: '8px',
                  }}
                >
                  {loading ? 'Sending...' : "Didn't receive it? Resend code"}
                </button>
              </form>
            )}

            {/* Step 3: Name & Thoughts */}
            {step === 'details' && (
              <form
                onSubmit={handleDetailsSubmit}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  maxWidth: '400px',
                  width: '100%',
                }}
              >
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your name"
                  required
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1a1a1a',
                    outline: 'none',
                    opacity: loading ? 0.7 : 1,
                  }}
                />
                <textarea
                  value={thoughts}
                  onChange={e => setThoughts(e.target.value)}
                  placeholder="Tell us a little about you and what you hope to achieve with MyYoga.Guru (optional)"
                  disabled={loading}
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '16px 24px',
                    fontSize: '16px',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'rgba(255,255,255,0.95)',
                    color: '#1a1a1a',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    opacity: loading ? 0.7 : 1,
                  }}
                />
                <button
                  type="submit"
                  disabled={loading || !name.trim()}
                  style={{
                    width: '100%',
                    padding: '16px 32px',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--color-primary)',
                    color: '#fff',
                    cursor: loading || !name.trim() ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    boxShadow:
                      '0 8px 32px color-mix(in srgb, var(--color-primary) 40%, transparent)',
                    opacity: loading || !name.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? 'Joining...' : 'Join the Waitlist'}
                </button>
              </form>
            )}
          </>
        )}

        {/* Social Links */}
        <div
          style={{
            marginTop: '64px',
            display: 'flex',
            gap: '24px',
          }}
        >
          {[
            {
              name: 'Instagram',
              href: 'https://www.instagram.com/myyoga.guru/',
              icon: (
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              ),
            },
            {
              name: 'Facebook',
              href: 'https://www.facebook.com/myyogaguruonfb',
              icon: (
                <svg width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              ),
            },
          ].map(social => (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                transition: 'background 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              title={social.name}
            >
              {social.icon}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
