'use client';

import type { FormEvent } from 'react';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SigninForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/app';
  const errorParam = searchParams.get('error');

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

      // Redirect to callback URL or default
      window.location.href = data.redirectUrl || callbackUrl;
    } catch (err) {
      console.error('[DBG][signin] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
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
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '700',
              marginBottom: '16px',
              lineHeight: '1.2',
            }}
          >
            Welcome Back
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.95 }}>
            Sign in to continue your wellness journey
          </p>
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
                  background: isSubmitting
                    ? '#ccc'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                    color: '#764ba2',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  Create one
                </Link>
              </p>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                Are you a yoga instructor?
              </p>
              <Link
                href="/auth/expert-signup"
                style={{
                  color: '#764ba2',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Expert signup →
              </Link>
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
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>
        </div>
      }
    >
      <SigninForm />
    </Suspense>
  );
}
