'use client';

import type { FormEvent } from 'react';
import { useState, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getClientExpertContext } from '@/lib/domainContext';

function SigninForm() {
  const searchParams = useSearchParams();
  const callbackUrlParam = searchParams.get('callbackUrl');
  const errorParam = searchParams.get('error');
  const [isExpertDomain, setIsExpertDomain] = useState(false);

  useEffect(() => {
    const { isExpertMode } = getClientExpertContext();
    setIsExpertDomain(isExpertMode);
  }, []);

  // Default callback: /app for main domain (role-based redirect happens in API), / for expert domains
  const callbackUrl = callbackUrlParam || (isExpertDomain ? '/' : '/app');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(
    errorParam === 'CredentialsSignin' ? 'Invalid email or password' : null
  );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!email.trim() || !password) {
      setError('Email and password are required');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('[DBG][signin] Submitting login form');

      const res = await fetch('/api/auth/cognito/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        // Handle user not confirmed
        if (data.code === 'USER_NOT_CONFIRMED') {
          // Store password for auto-login after verification
          sessionStorage.setItem('pending_signup_password', password);
          window.location.href = `/auth/verify-email?email=${encodeURIComponent(email)}`;
          return;
        }
        throw new Error(data.message || 'Login failed');
      }

      console.log('[DBG][signin] Login successful, redirecting');

      // On expert domains, learners should go to landing page (/), not /app
      // Experts still go to /srv to manage their site
      let finalRedirectUrl = data.redirectUrl || callbackUrl;
      if (isExpertDomain && finalRedirectUrl === '/app') {
        finalRedirectUrl = '/';
      }
      window.location.href = finalRedirectUrl;
    } catch (err) {
      console.error('[DBG][signin] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
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
            {/* Header Image - only show on main domain */}
            {!isExpertDomain && (
              <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/yg_girl_signup.png"
                  alt="Welcome"
                  style={{
                    width: '120px',
                    height: 'auto',
                    margin: '0 auto',
                  }}
                />
              </div>
            )}

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

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333',
                  }}
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={e => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333',
                  }}
                >
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={password}
                    onChange={e => {
                      setPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="Enter your password"
                    required
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 16px',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      fontSize: '16px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      color: '#666',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background: isSubmitting ? '#ccc' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            {/* Divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                margin: '24px 0',
                gap: '16px',
              }}
            >
              <div style={{ flex: 1, height: '1px', background: '#ddd' }} />
              <span style={{ color: '#999', fontSize: '14px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#ddd' }} />
            </div>

            {/* Google Sign In */}
            <a
              href={`/api/auth/google?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 24px',
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#f8f8f8';
                e.currentTarget.style.borderColor = '#ccc';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </a>

            {/* Facebook Sign In - commented out for now
            <a
              href={`/api/auth/facebook?callbackUrl=${encodeURIComponent(callbackUrl)}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 24px',
                marginTop: '12px',
                background: '#fff',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#f8f8f8';
                e.currentTarget.style.borderColor = '#ccc';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#fff';
                e.currentTarget.style.borderColor = '#ddd';
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Continue with Facebook
            </a>
            */}

            {/* Forgot Password - commented out for now
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link
                href="/auth/forgot-password"
                style={{
                  color: '#764ba2',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                Forgot your password?
              </Link>
            </div>
            */}

            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid #eee',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: '#666' }}>
                Don&apos;t have an account?{' '}
                <Link
                  href="/auth/signup"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  Create one
                </Link>
              </p>
            </div>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              <Link
                href="/"
                style={{
                  color: '#999',
                  textDecoration: 'none',
                  fontSize: '14px',
                }}
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SigninPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: '#f8f8f8' }}>
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>
        </div>
      }
    >
      <SigninForm />
    </Suspense>
  );
}
