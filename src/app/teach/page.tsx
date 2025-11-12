'use client';

import Link from 'next/link';

export default function TeachPage() {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#fff' }}>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '120px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: '700',
              marginBottom: '24px',
              lineHeight: '1.2',
            }}
          >
            Share Your Expertise with MyYoga
          </h1>
          <p
            style={{
              fontSize: '20px',
              marginBottom: '40px',
              opacity: 0.95,
              lineHeight: '1.6',
            }}
          >
            Join our community of expert instructors and inspire students worldwide to transform
            their lives through yoga.
          </p>
          <Link
            href="/teach/apply"
            style={{
              padding: '16px 32px',
              background: '#fff',
              color: '#764ba2',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Apply to Teach
          </Link>
        </div>
      </section>

      {/* Benefits Section */}
      <section style={{ padding: '80px 20px', background: '#f8f8f8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '600',
              marginBottom: '48px',
              textAlign: 'center',
            }}
          >
            Why Teach on MyYoga?
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px',
            }}
          >
            {/* Benefit 1 */}
            <div
              style={{
                background: '#fff',
                padding: '32px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#764ba2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
                Reach Global Students
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                Share your knowledge with students from around the world and build your reputation
                as an expert instructor.
              </p>
            </div>

            {/* Benefit 2 */}
            <div
              style={{
                background: '#fff',
                padding: '32px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#764ba2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24">
                  <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
                Flexible Schedule
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                Create courses on your own time. Record and upload content when it works best for
                you.
              </p>
            </div>

            {/* Benefit 3 */}
            <div
              style={{
                background: '#fff',
                padding: '32px',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  background: '#764ba2',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '16px',
                }}
              >
                <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24">
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>
                Build Your Community
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                Connect with dedicated students and build a loyal following of practitioners.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requirements Section */}
      <section style={{ padding: '80px 20px', background: '#fff' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '600',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            What We&apos;re Looking For
          </h2>
          <p
            style={{
              fontSize: '16px',
              color: '#666',
              marginBottom: '40px',
              textAlign: 'center',
              lineHeight: '1.6',
            }}
          >
            We&apos;re seeking experienced yoga instructors who are passionate about teaching and
            committed to helping students achieve their goals.
          </p>
          <div style={{ background: '#f8f8f8', padding: '32px', borderRadius: '12px' }}>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="24"
                  height="24"
                  fill="#764ba2"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0 }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#333' }}>
                  Certified yoga instructor with 200+ hour training
                </span>
              </li>
              <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="24"
                  height="24"
                  fill="#764ba2"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0 }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#333' }}>
                  Minimum 2 years of teaching experience
                </span>
              </li>
              <li style={{ marginBottom: '16px', display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="24"
                  height="24"
                  fill="#764ba2"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0 }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#333' }}>
                  Passion for teaching and helping students grow
                </span>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start' }}>
                <svg
                  width="24"
                  height="24"
                  fill="#764ba2"
                  viewBox="0 0 24 24"
                  style={{ marginRight: '12px', flexShrink: 0 }}
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                <span style={{ fontSize: '16px', color: '#333' }}>
                  Ability to create engaging video content
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          padding: '80px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#fff',
            }}
          >
            Ready to Get Started?
          </h2>
          <p
            style={{
              fontSize: '16px',
              marginBottom: '32px',
              color: '#fff',
              opacity: 0.95,
              lineHeight: '1.6',
            }}
          >
            Submit your application today. We&apos;ll review your credentials and reach out to you
            via email and phone within 5 business days.
          </p>
          <Link
            href="/teach/apply"
            style={{
              padding: '16px 32px',
              background: '#fff',
              color: '#764ba2',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'transform 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Apply Now
          </Link>
        </div>
      </section>
    </div>
  );
}
