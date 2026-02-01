'use client';

import { getClientExpertContext } from '@/lib/domainContext';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import type { FormEvent } from 'react';
import { Suspense, useEffect, useState } from 'react';

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface PasswordStrength {
  score: number;
  hasLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
}

function checkPasswordStrength(password: string): PasswordStrength {
  return {
    score: [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length,
    hasLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

function SignupForm() {
  const searchParams = useSearchParams();
  const authToken = searchParams.get('auth_token');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    hasLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
  });
  const [isExpertDomain, setIsExpertDomain] = useState(false);
  const [signupExpertId, setSignupExpertId] = useState<string | null>(null);
  const [expertName, setExpertName] = useState<string | null>(null);

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(formData.password));
  }, [formData.password]);

  useEffect(() => {
    const { isExpertMode, expertId } = getClientExpertContext();
    setIsExpertDomain(isExpertMode);
    setSignupExpertId(isExpertMode ? expertId : null);

    // Fetch expert name if on subdomain
    if (isExpertMode && expertId) {
      fetch(`/data/experts/${expertId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.name) {
            setExpertName(data.data.name);
          }
        })
        .catch(() => {
          // Fallback to expertId if fetch fails
          setExpertName(expertId);
        });
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate
    if (!formData.name.trim()) {
      setError('Name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (passwordStrength.score < 5) {
      setError('Password does not meet all requirements');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('[DBG][signup] Submitting signup form');

      const res = await fetch('/api/auth/cognito/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          phone: formData.phone.trim() || undefined,
          // On expert subdomain, users are learners only; on main domain, they're experts
          roles: isExpertDomain ? ['learner'] : ['learner', 'expert'],
          authToken: authToken || undefined,
          // Track which expert subdomain the user signed up from
          signupExpertId: signupExpertId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Signup failed');
      }

      console.log('[DBG][signup] Signup successful, redirecting to verify');

      // Store password temporarily for auto-login after verification
      sessionStorage.setItem('pending_signup_password', formData.password);

      // Redirect to verify email
      const verifyUrl = `/auth/verify-email?email=${encodeURIComponent(data.email)}`;
      window.location.href = verifyUrl;
    } catch (err) {
      console.error('[DBG][signup] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const getStrengthColor = () => {
    if (passwordStrength.score <= 2) return '#dc3545';
    if (passwordStrength.score <= 3) return '#ffc107';
    if (passwordStrength.score <= 4) return '#17a2b8';
    return '#28a745';
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-main)' }}>
      {/* Form Section */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
          <div
            style={{
              background: 'var(--color-surface)',
              padding: '48px',
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1
                style={{
                  fontSize: '32px',
                  fontWeight: 200,
                  color: 'var(--text-main)',
                  margin: 0,
                  lineHeight: 1.1,
                  textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>
                  {isExpertDomain && expertName ? expertName : 'Sign Up'}
                </span>
                <br />
                my yoga
                <br />
                guru
              </h1>
            </div>

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
              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="name"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-body)',
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  disabled={isSubmitting}
                  autoComplete="name"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-body)',
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  disabled={isSubmitting}
                  autoComplete="email"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="phone"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-body)',
                  }}
                >
                  Mobile Number (optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+91 9876543210"
                  disabled={isSubmitting}
                  autoComplete="tel"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  Include country code (e.g., +91 for India)
                </p>
              </div>

              {/* Password */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="password"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-body)',
                  }}
                >
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    disabled={isSubmitting}
                    autoComplete="new-password"
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 16px',
                      border: '1px solid var(--color-border)',
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
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>

                {/* Password Strength Bar */}
                {formData.password && (
                  <div style={{ marginTop: '8px' }}>
                    <div
                      style={{
                        height: '4px',
                        background: 'var(--color-border)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${(passwordStrength.score / 5) * 100}%`,
                          background: getStrengthColor(),
                          transition: 'all 0.3s',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: '8px',
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '4px',
                        }}
                      >
                        <span style={{ color: passwordStrength.hasLength ? '#28a745' : '#999' }}>
                          {passwordStrength.hasLength ? '✓' : '○'} 8+ characters
                        </span>
                        <span style={{ color: passwordStrength.hasUppercase ? '#28a745' : '#999' }}>
                          {passwordStrength.hasUppercase ? '✓' : '○'} Uppercase
                        </span>
                        <span style={{ color: passwordStrength.hasLowercase ? '#28a745' : '#999' }}>
                          {passwordStrength.hasLowercase ? '✓' : '○'} Lowercase
                        </span>
                        <span style={{ color: passwordStrength.hasNumber ? '#28a745' : '#999' }}>
                          {passwordStrength.hasNumber ? '✓' : '○'} Number
                        </span>
                        <span style={{ color: passwordStrength.hasSpecial ? '#28a745' : '#999' }}>
                          {passwordStrength.hasSpecial ? '✓' : '○'} Special char
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="confirmPassword"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: 'var(--text-body)',
                  }}
                >
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: `1px solid ${formData.confirmPassword && formData.password !== formData.confirmPassword ? '#dc3545' : 'var(--color-border)'}`,
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <p style={{ fontSize: '12px', color: '#dc3545', marginTop: '4px' }}>
                    Passwords do not match
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || passwordStrength.score < 5}
                style={{
                  width: '100%',
                  padding: '14px 24px',
                  background:
                    isSubmitting || passwordStrength.score < 5 ? '#ccc' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSubmitting || passwordStrength.score < 5 ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>or</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--color-border)' }} />
            </div>

            {/* Google Sign Up - uses <a> intentionally for full page redirect to API route */}
            {}
            <a
              href={`/api/auth/google?callbackUrl=${isExpertDomain ? '/' : '/srv'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                width: '100%',
                padding: '14px 24px',
                background: 'var(--color-surface)',
                color: 'var(--text-body)',
                border: '1px solid var(--color-border)',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '500',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = 'var(--color-bg-main)';
                e.currentTarget.style.borderColor = 'var(--text-muted)';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = 'var(--color-surface)';
                e.currentTarget.style.borderColor = 'var(--color-border)';
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

            {/* Facebook Sign Up - commented out for now
            <a
              href={`/api/auth/facebook?callbackUrl=${isExpertDomain ? '/' : '/srv'}`}
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

            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid var(--color-border)',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Already have an account?{' '}
                <Link
                  href="/auth/signin"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontWeight: '500',
                  }}
                >
                  Sign in
                </Link>
              </p>
            </div>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Link
                href="/"
                style={{
                  color: 'var(--text-muted)',
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', background: 'var(--color-bg-main)' }}>
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-body)' }}>
            Loading...
          </div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
