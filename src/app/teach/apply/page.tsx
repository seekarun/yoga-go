'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ApplyPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    bio: '',
    reasonForTeaching: '',
  });

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('[DBG][apply/page.tsx] Submitting teaching lead application');

      const res = await fetch('/api/teaching-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      console.log('[DBG][apply/page.tsx] Application submitted successfully');
      router.push('/teach/confirmation');
    } catch (err) {
      console.error('[DBG][apply/page.tsx] Submission error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
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
            Apply to Teach on MyYoga
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.95 }}>
            Tell us about yourself and why you want to teach
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section style={{ padding: '60px 20px' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
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
                  border: '1px solid #fcc',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  color: '#c33',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="name"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="John Doe"
                />
              </div>

              {/* Email */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="email"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="john@example.com"
                />
              </div>

              {/* Phone */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="phone"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                  }}
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              {/* Bio */}
              <div style={{ marginBottom: '24px' }}>
                <label
                  htmlFor="bio"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  Bio / Background *
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  required
                  value={formData.bio}
                  onChange={handleChange}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  placeholder="Tell us about your yoga journey, certifications, teaching experience..."
                />
              </div>

              {/* Reason for Teaching */}
              <div style={{ marginBottom: '32px' }}>
                <label
                  htmlFor="reasonForTeaching"
                  style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '8px',
                    color: '#333',
                  }}
                >
                  Why Do You Want to Teach on MyYoga? *
                </label>
                <textarea
                  id="reasonForTeaching"
                  name="reasonForTeaching"
                  required
                  value={formData.reasonForTeaching}
                  onChange={handleChange}
                  rows={5}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    fontSize: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                  }}
                  placeholder="What motivates you to share your expertise? What makes you passionate about teaching yoga?"
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <Link
                  href="/teach"
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
                    transition: 'background 0.2s, color 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = '#f8f8f8';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '14px 32px',
                    background: isSubmitting ? '#ccc' : '#764ba2',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    transition: 'opacity 0.2s',
                    opacity: isSubmitting ? 0.6 : 1,
                  }}
                  onMouseEnter={e => {
                    if (!isSubmitting) e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={e => {
                    if (!isSubmitting) e.currentTarget.style.opacity = '1';
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
