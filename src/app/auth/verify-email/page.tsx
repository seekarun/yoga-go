'use client';

import type { FormEvent } from 'react';
import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, '').slice(-1);

    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError(null);

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (digit && index === 5 && newCode.every(d => d)) {
      handleSubmit(undefined, newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);

    if (pastedData.length === 6) {
      const newCode = pastedData.split('');
      setCode(newCode);
      inputRefs.current[5]?.focus();

      // Auto-submit
      handleSubmit(undefined, pastedData);
    }
  };

  const handleSubmit = async (e?: FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();

    const verificationCode = codeOverride || code.join('');

    if (verificationCode.length !== 6) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('[DBG][verify-email] Verifying code');

      // Get stored password for auto-login
      const password = sessionStorage.getItem('pending_signup_password');

      const res = await fetch('/api/auth/cognito/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          code: verificationCode,
          password: password || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification failed');
      }

      console.log('[DBG][verify-email] Verification successful');

      // Clear stored password
      sessionStorage.removeItem('pending_signup_password');

      setSuccess('Email verified successfully! Redirecting...');

      // Redirect
      setTimeout(() => {
        window.location.href = data.redirectUrl || '/app';
      }, 1500);
    } catch (err) {
      console.error('[DBG][verify-email] Error:', err);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setIsSubmitting(false);

      // Clear code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('[DBG][verify-email] Resending code');

      const res = await fetch('/api/auth/cognito/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to resend code');
      }

      setSuccess('Verification code sent! Check your email.');
      setResendCooldown(60); // 60 second cooldown
    } catch (err) {
      console.error('[DBG][verify-email] Resend error:', err);
      setError(err instanceof Error ? err.message : 'Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary) 0%, var(--color-highlight) 100%)',
          color: '#fff',
          padding: '60px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
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
          <p style={{ fontSize: '18px', opacity: 0.95 }}>We&apos;ve sent a verification code to</p>
          <p style={{ fontSize: '20px', fontWeight: '600', marginTop: '8px' }}>{email}</p>
        </div>
      </section>

      {/* Form Section */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '450px', margin: '0 auto' }}>
          <div
            style={{
              background: '#fff',
              padding: '48px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#fee',
                  color: '#c33',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  padding: '12px 16px',
                  background: '#d4edda',
                  color: '#155724',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  fontSize: '14px',
                }}
              >
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <p
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '24px',
                  textAlign: 'center',
                }}
              >
                Enter the 6-digit code from your email
              </p>

              {/* Code Input */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
              >
                {code.map((digit, index) => (
                  <input
                    key={index}
                    ref={el => {
                      inputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleCodeChange(index, e.target.value)}
                    onKeyDown={e => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={isSubmitting}
                    style={{
                      width: '48px',
                      height: '56px',
                      textAlign: 'center',
                      fontSize: '24px',
                      fontWeight: '600',
                      border: '2px solid #ddd',
                      borderRadius: '8px',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = 'var(--color-primary)';
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = '#ddd';
                    }}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || code.some(d => !d)}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: isSubmitting || code.some(d => !d) ? '#ccc' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSubmitting || code.some(d => !d) ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {isSubmitting ? 'Verifying...' : 'Verify Email'}
              </button>
            </form>

            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid #eee',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Didn&apos;t receive the code?
              </p>
              <button
                onClick={handleResend}
                disabled={resendCooldown > 0 || isResending}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? '#999' : 'var(--color-primary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: resendCooldown > 0 ? 'default' : 'pointer',
                  textDecoration: 'none',
                }}
              >
                {isResending
                  ? 'Sending...'
                  : resendCooldown > 0
                    ? `Resend code (${resendCooldown}s)`
                    : 'Resend code'}
              </button>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link
                href="/auth/signin"
                style={{
                  color: '#999',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                ← Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
