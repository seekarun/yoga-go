'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import Link from 'next/link';

export default function ExpertSignupPage() {
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!code.trim()) {
      setError('Please enter an expert signup code');
      setIsSubmitting(false);
      return;
    }

    try {
      console.log('[DBG][expert-signup] Validating expert code');

      const res = await fetch('/auth/expert-signup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Invalid expert signup code');
      }

      console.log('[DBG][expert-signup] Code validated, redirecting to signup');

      // Redirect to signup with auth token and expert role
      window.location.href = `/auth/signup?role=expert&auth_token=${data.authToken}`;
    } catch (err) {
      console.error('[DBG][expert-signup] Validation error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
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
            Expert Signup
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.95 }}>
            Enter your expert signup code to create your account
          </p>
        </div>
      </section>

      {/* Form Section */}
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
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="code"
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#333',
                  }}
                >
                  Expert Signup Code *
                </label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="Enter your expert code"
                  required
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontFamily: 'monospace',
                    letterSpacing: '2px',
                    textTransform: 'uppercase',
                  }}
                />
                <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  You should have received this code from the MyYoga team
                </p>
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
                onMouseOver={e => {
                  if (!isSubmitting) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                {isSubmitting ? 'Validating...' : 'Continue to Signup'}
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
                Don&apos;t have an expert code?
              </p>
              <Link
                href="/teach/apply"
                style={{
                  color: 'var(--color-primary)',
                  textDecoration: 'none',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Apply to become an expert →
              </Link>
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
