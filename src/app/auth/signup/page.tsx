'use client';

import type { FormEvent } from 'react';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

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
  const role = searchParams.get('role');
  const authToken = searchParams.get('auth_token');
  const isExpert = role === 'expert';

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

  useEffect(() => {
    setPasswordStrength(checkPasswordStrength(formData.password));
  }, [formData.password]);

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
          role: isExpert ? 'expert' : 'learner',
          authToken: authToken || undefined,
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
            {isExpert ? 'Expert Signup' : 'Create Account'}
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.95 }}>
            {isExpert
              ? 'Complete your expert account registration'
              : 'Join MyYoga and start your wellness journey'}
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '500px', margin: '0 auto' }}>
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
              {/* Name */}
              <div style={{ marginBottom: '20px' }}>
                <label
                  htmlFor="name"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333',
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
                    border: '1px solid #ddd',
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
                    color: '#333',
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
                    border: '1px solid #ddd',
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
                    color: '#333',
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
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
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
                    color: '#333',
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

                {/* Password Strength Bar */}
                {formData.password && (
                  <div style={{ marginTop: '8px' }}>
                    <div
                      style={{
                        height: '4px',
                        background: '#eee',
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
                        color: '#666',
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
                    color: '#333',
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
                    border: `1px solid ${formData.confirmPassword && formData.password !== formData.confirmPassword ? '#dc3545' : '#ddd'}`,
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

            <div
              style={{
                marginTop: '32px',
                paddingTop: '32px',
                borderTop: '1px solid #eee',
                textAlign: 'center',
              }}
            >
              <p style={{ fontSize: '14px', color: '#666' }}>
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

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
          <div style={{ textAlign: 'center', padding: '100px 20px' }}>Loading...</div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
