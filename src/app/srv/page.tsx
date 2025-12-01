'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import ExpertOnboarding from '@/components/ExpertOnboarding';
import type { Expert } from '@/types';

export default function ExpertPlatform() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [expertProfile, setExpertProfile] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Helper to check if user has a role (handles array format)
  const hasRole = (role: string) => {
    if (!user?.role) return false;
    return Array.isArray(user.role)
      ? user.role.includes(role as 'learner' | 'expert' | 'admin')
      : user.role === role;
  };

  useEffect(() => {
    // Only fetch expert profile if user is authenticated and is an expert
    if (isAuthenticated && hasRole('expert')) {
      fetchExpertProfile();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const fetchExpertProfile = async () => {
    console.log('[DBG][srv/page.tsx] Fetching expert profile');
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/data/app/expert/me');
      const result = await response.json();

      console.log('[DBG][srv/page.tsx] Expert profile response:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch expert profile');
      }

      if (result.success && result.data) {
        setExpertProfile(result.data);
      } else {
        // Expert profile doesn't exist yet
        setExpertProfile(null);
      }
    } catch (err) {
      console.error('[DBG][srv/page.tsx] Error fetching expert profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch expert profile');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while auth is loading
  if (authLoading || loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Loading...</div>
        </div>
      </div>
    );
  }

  // Case 1: User is not authenticated - Show SaaS Landing Page
  if (!isAuthenticated) {
    return <ExpertLandingPage />;
  }

  // Case 2: User is authenticated but NOT an expert - show landing page with upgrade option
  if (!hasRole('expert')) {
    return <ExpertLandingPage isAuthenticated={isAuthenticated} />;
  }

  // Case 3: User is expert with error - Show Error State
  if (hasRole('expert') && error) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7fafc',
        }}
      >
        <div style={{ maxWidth: '600px', padding: '40px', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fee',
              margin: '0 auto 24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '32px',
            }}
          >
            ⚠️
          </div>
          <h1
            style={{ fontSize: '24px', fontWeight: '700', marginBottom: '12px', color: '#2d3748' }}
          >
            Expert Profile Error
          </h1>
          <p
            style={{ fontSize: '16px', color: '#718096', marginBottom: '24px', lineHeight: '1.6' }}
          >
            {error}
          </p>
          <div
            style={{
              background: '#fffaf0',
              border: '1px solid #fed7aa',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
            }}
          >
            <p
              style={{
                fontSize: '14px',
                color: '#744210',
                marginBottom: '12px',
                fontWeight: '600',
              }}
            >
              Possible causes:
            </p>
            <ul style={{ fontSize: '14px', color: '#744210', paddingLeft: '20px', margin: 0 }}>
              <li>Your expert profile link may be broken</li>
              <li>The expert profile was deleted or moved</li>
              <li>Database connection issue</li>
            </ul>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => {
                setError('');
                fetchExpertProfile();
              }}
              style={{
                padding: '12px 24px',
                background: '#667eea',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              🔄 Retry
            </button>
            <button
              onClick={() => {
                setError('');
                setExpertProfile(null);
              }}
              style={{
                padding: '12px 24px',
                background: '#fff',
                color: '#667eea',
                border: '2px solid #667eea',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
            >
              📝 Reset & Re-onboard
            </button>
            <Link
              href="/app"
              style={{
                padding: '12px 24px',
                background: '#fff',
                color: '#718096',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              ← Back to App
            </Link>
          </div>
          <div style={{ marginTop: '24px', fontSize: '14px', color: '#a0aec0' }}>
            Need help? Contact support with error details above
          </div>
        </div>
      </div>
    );
  }

  // Case 4: User is expert but profile doesn't exist - Show Onboarding
  if (hasRole('expert') && !expertProfile) {
    return (
      <div style={{ paddingTop: '64px' }}>
        <ExpertOnboarding
          userEmail={user?.profile.email || ''}
          userName={user?.profile?.name || user?.profile.email.split('@')[0] || 'Expert'}
        />
      </div>
    );
  }

  // Case 5: User is expert with completed profile - Redirect to expert dashboard
  if (hasRole('expert') && expertProfile) {
    router.push(`/srv/${expertProfile.id}`);
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', color: '#666' }}>Redirecting to dashboard...</div>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '16px', color: '#666' }}>
          Something went wrong. Please try again.
        </div>
      </div>
    </div>
  );
}

// SaaS Landing Page for unauthenticated users and learners
function ExpertLandingPage({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');

  const handleUpgradeToExpert = async () => {
    setUpgrading(true);
    setUpgradeError('');
    try {
      const response = await fetch('/api/user/become-expert', {
        method: 'POST',
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to upgrade to expert');
      }
      // Reload the page to show expert onboarding
      window.location.reload();
    } catch (err) {
      console.error('[DBG][srv/page] Upgrade error:', err);
      setUpgradeError(err instanceof Error ? err.message : 'Failed to upgrade');
      setUpgrading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          height: '50vh',
          minHeight: '500px',
          overflow: 'hidden',
        }}
      >
        {/* Background Image */}
        <Image
          src="/yg_teach1.jpg"
          alt="Yoga instructor teaching"
          fill
          style={{ objectFit: 'cover', objectPosition: 'center' }}
          priority
        />

        {/* Gradient Overlay with Primary Color */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'linear-gradient(to bottom, transparent 0%, color-mix(in srgb, var(--color-primary) 40%, transparent) 50%, color-mix(in srgb, var(--color-primary) 90%, transparent) 100%)',
          }}
        />

        {/* Content Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '40px 20px 60px',
          }}
        >
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ maxWidth: '800px', color: '#fff' }}>
              <h1
                style={{
                  fontSize: '56px',
                  fontWeight: '700',
                  marginBottom: '20px',
                  lineHeight: '1.2',
                  textShadow: '0 2px 10px rgba(0,0,0,0.3)',
                }}
              >
                Build Your Yoga Business Online
              </h1>
              <p
                style={{
                  fontSize: '20px',
                  marginBottom: '32px',
                  lineHeight: '1.6',
                  textShadow: '0 1px 5px rgba(0,0,0,0.3)',
                }}
              >
                Share your expertise, reach students worldwide, and earn income doing what you love.
                Join hundreds of yoga instructors building thriving online practices.
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '16px',
                  flexWrap: 'wrap',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                }}
              >
                {upgradeError && (
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'rgba(255,0,0,0.2)',
                      color: '#fff',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    {upgradeError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                  {isAuthenticated ? (
                    // Authenticated learner - show upgrade button
                    <button
                      onClick={handleUpgradeToExpert}
                      disabled={upgrading}
                      style={{
                        padding: '16px 40px',
                        background: upgrading ? '#ccc' : '#fff',
                        color: 'var(--color-primary)',
                        borderRadius: '8px',
                        fontSize: '18px',
                        fontWeight: '600',
                        border: 'none',
                        cursor: upgrading ? 'not-allowed' : 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                      }}
                    >
                      {upgrading ? 'Upgrading...' : 'Start Teaching Today'}
                    </button>
                  ) : (
                    // Unauthenticated - show signup link
                    <Link
                      href="/auth/signup?source=srv"
                      style={{
                        padding: '16px 40px',
                        background: '#fff',
                        color: 'var(--color-primary)',
                        borderRadius: '8px',
                        fontSize: '18px',
                        fontWeight: '600',
                        textDecoration: 'none',
                        display: 'inline-block',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
                      }}
                    >
                      Start Teaching Today
                    </Link>
                  )}
                  <a
                    href="#features"
                    style={{
                      padding: '16px 40px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      border: '2px solid #fff',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: '600',
                      textDecoration: 'none',
                      display: 'inline-block',
                      transition: 'transform 0.2s',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ padding: '100px 20px', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '60px',
            }}
          >
            Everything You Need to Succeed
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '60px',
              maxWidth: '1200px',
              margin: '0 auto',
            }}
          >
            {/* Feature 1 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>💰</div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Earn More Income
              </h3>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                Set your own prices and keep most of what you earn. Build a sustainable income from
                your passion.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🌍</div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Global Reach
              </h3>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                Teach students from around the world. No geographic limitations on your impact.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🤝</div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Expert Support
              </h3>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                Get dedicated support to help you succeed and grow your online yoga business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section style={{ padding: '100px 20px', background: '#f8f8f8' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '60px',
            }}
          >
            Get Started in 3 Simple Steps
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* Step 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div
                style={{
                  minWidth: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                }}
              >
                1
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                  Create Your Expert Profile
                </h3>
                <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                  Sign up and tell us about your expertise, certifications, and teaching style.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div
                style={{
                  minWidth: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                }}
              >
                2
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                  Build Your First Course
                </h3>
                <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                  Upload videos, organize lessons, and create a comprehensive learning experience.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px' }}>
              <div
                style={{
                  minWidth: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: '700',
                }}
              >
                3
              </div>
              <div>
                <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                  Start Earning
                </h3>
                <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                  Publish your course and watch as students enroll and your income grows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section style={{ padding: '100px 20px', background: '#fff' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '600',
              textAlign: 'center',
              marginBottom: '60px',
            }}
          >
            Trusted by Expert Instructors
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '32px',
            }}
          >
            {/* Testimonial 1 */}
            <div
              style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⭐⭐⭐⭐⭐</div>
              <p
                style={{ fontSize: '16px', color: '#333', marginBottom: '20px', lineHeight: '1.6' }}
              >
                &quot;Yoga-GO has transformed my teaching practice. I now reach students worldwide
                and earn more than I ever did with in-person classes.&quot;
              </p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                - Sarah M., Vinyasa Expert
              </p>
            </div>

            {/* Testimonial 2 */}
            <div
              style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⭐⭐⭐⭐⭐</div>
              <p
                style={{ fontSize: '16px', color: '#333', marginBottom: '20px', lineHeight: '1.6' }}
              >
                &quot;The platform is incredibly easy to use. I created my first course in just a
                weekend and had my first students within days.&quot;
              </p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                - Michael Chen, Power Yoga Instructor
              </p>
            </div>

            {/* Testimonial 3 */}
            <div
              style={{
                background: '#f8f8f8',
                borderRadius: '12px',
                padding: '32px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⭐⭐⭐⭐⭐</div>
              <p
                style={{ fontSize: '16px', color: '#333', marginBottom: '20px', lineHeight: '1.6' }}
              >
                &quot;I love the flexibility. I create content when it works for me and earn passive
                income 24/7. Best decision for my career.&quot;
              </p>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-primary)' }}>
                - Priya Sharma, Meditation Teacher
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
          color: '#fff',
          padding: '100px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '42px', fontWeight: '600', marginBottom: '24px' }}>
            Ready to Share Your Expertise?
          </h2>
          <p style={{ fontSize: '20px', marginBottom: '40px', opacity: 0.95 }}>
            Join the Yoga-GO expert community today and start building your online yoga business.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/srv"
            style={{
              padding: '16px 48px',
              background: '#fff',
              color: 'var(--color-primary)',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              textDecoration: 'none',
              display: 'inline-block',
              transition: 'transform 0.2s',
            }}
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
