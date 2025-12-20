'use client';

import ExpertOnboarding from '@/components/ExpertOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { PrimaryButton, SecondaryButton } from '@/components/Button';
import type { Expert } from '@/types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
            <PrimaryButton
              onClick={() => {
                setError('');
                fetchExpertProfile();
              }}
            >
              🔄 Retry
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                setError('');
                setExpertProfile(null);
              }}
            >
              📝 Reset & Re-onboard
            </SecondaryButton>
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

// Modern SaaS Landing Page - Light theme with subtle gradients
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
      window.location.reload();
    } catch (err) {
      console.error('[DBG][srv/page] Upgrade error:', err);
      setUpgradeError(err instanceof Error ? err.message : 'Failed to upgrade');
      setUpgrading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      {/* Hero Section */}
      <section
        style={{
          minHeight: '60vh',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
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
          }}
        />

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            width: '100%',
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '80px 24px 60px',
          }}
        >
          <div style={{ maxWidth: '800px' }}>
            {/* Badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '50px',
                marginBottom: '32px',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--color-primary-light)',
                }}
              />
              <span style={{ fontSize: '14px', color: '#fff', fontWeight: '500' }}>
                Now accepting new yoga instructors
              </span>
            </div>

            {/* Headline */}
            <h1
              style={{
                fontSize: 'clamp(40px, 8vw, 72px)',
                fontWeight: '800',
                lineHeight: '1.1',
                color: '#fff',
                marginBottom: '24px',
                letterSpacing: '-0.03em',
              }}
            >
              Launch your yoga
              <br />
              <span
                style={{
                  background: 'linear-gradient(135deg, var(--color-primary-light) 0%, #fff 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                business online
              </span>
            </h1>

            {/* Subheadline */}
            <p
              style={{
                fontSize: 'clamp(18px, 2.5vw, 24px)',
                lineHeight: '1.6',
                color: 'rgba(255,255,255,0.85)',
                marginBottom: '48px',
                maxWidth: '600px',
              }}
            >
              Create your professional website, sell courses, and host live sessions. Everything you
              need to build a thriving online yoga practice.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '64px' }}>
              {upgradeError && (
                <div
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '8px',
                    color: '#fca5a5',
                    fontSize: '14px',
                  }}
                >
                  {upgradeError}
                </div>
              )}
              {isAuthenticated ? (
                <PrimaryButton
                  onClick={handleUpgradeToExpert}
                  disabled={upgrading}
                  loading={upgrading}
                  size="large"
                >
                  {upgrading ? 'Setting up...' : 'Get Started Free'}
                </PrimaryButton>
              ) : (
                <PrimaryButton href="/auth/signup" size="large">
                  Get Started Free
                </PrimaryButton>
              )}
              <SecondaryButton href="#how-it-works" size="large">
                See How It Works
              </SecondaryButton>
            </div>
          </div>
        </div>
      </section>

      {/* Video + Text Section */}
      <section
        style={{
          padding: '60px 24px',
          background: 'var(--color-primary-light)',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '60px',
            alignItems: 'center',
          }}
        >
          {/* Video on Left */}
          <div
            style={{
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              aspectRatio: '16/9',
              background: '#000',
            }}
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            >
              <source src="/landing-video.mp4" type="video/mp4" />
            </video>
            {/* Play button overlay (decorative) */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  width: 0,
                  height: 0,
                  borderTop: '12px solid transparent',
                  borderBottom: '12px solid transparent',
                  borderLeft: '20px solid var(--color-primary)',
                  marginLeft: '4px',
                }}
              />
            </div>
          </div>

          {/* Text on Right */}
          <div>
            <h2
              style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: '700',
                color: 'var(--color-primary)',
                marginBottom: '24px',
                letterSpacing: '-0.02em',
                lineHeight: '1.2',
              }}
            >
              Everything you need to succeed
            </h2>
            <p
              style={{
                fontSize: '20px',
                lineHeight: '1.7',
                color: 'rgba(122, 41, 0, 0.8)',
              }}
            >
              All the tools to build, grow, and manage your online yoga business in one place.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        style={{
          padding: '120px 24px',
          background: '#fafafa',
          position: 'relative',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: 'color-mix(in srgb, var(--color-highlight) 15%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-highlight) 30%, transparent)',
                borderRadius: '50px',
                fontSize: '14px',
                color: 'var(--color-highlight)',
                fontWeight: '500',
                marginBottom: '24px',
              }}
            >
              FEATURES
            </span>
            <h2
              style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: '700',
                color: '#1a1a1a',
                marginBottom: '16px',
                letterSpacing: '-0.02em',
              }}
            >
              Everything you need to succeed
            </h2>
            <p
              style={{
                fontSize: '18px',
                color: '#666',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              All the tools to build, grow, and manage your online yoga business in one place.
            </p>
          </div>

          {/* Feature Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                icon: '🌐',
                title: 'Your Own Website',
                description:
                  'Get a beautiful, customizable website at yourname.myyoga.guru. No coding required.',
              },
              {
                icon: '📹',
                title: 'Course Builder',
                description:
                  'Create and sell video courses with our easy drag-and-drop builder. Upload unlimited content.',
              },
              {
                icon: '📺',
                title: 'Live Sessions',
                description:
                  'Host live classes and workshops with integrated Zoom. Automatic scheduling and reminders.',
              },
              {
                icon: '💳',
                title: 'Easy Payments',
                description:
                  'Accept payments worldwide with Stripe. Set your own prices, get paid instantly.',
              },
              {
                icon: '📊',
                title: 'Analytics',
                description:
                  'Track your growth with detailed analytics. Understand your students and optimize.',
              },
              {
                icon: '🎨',
                title: 'Beautiful Templates',
                description:
                  'Choose from professionally designed templates. Customize colors and layout to match your brand.',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                style={{
                  padding: '32px',
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: '20px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  style={{
                    fontSize: '40px',
                    marginBottom: '20px',
                  }}
                >
                  {feature.icon}
                </div>
                <h3
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#1a1a1a',
                    marginBottom: '12px',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: '15px',
                    lineHeight: '1.6',
                    color: '#666',
                  }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          padding: '120px 24px',
          background: '#fff',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '80px' }}>
            <span
              style={{
                display: 'inline-block',
                padding: '8px 16px',
                background: 'color-mix(in srgb, var(--color-primary-light) 30%, transparent)',
                border: '1px solid color-mix(in srgb, var(--color-primary) 20%, transparent)',
                borderRadius: '50px',
                fontSize: '14px',
                color: 'var(--color-primary)',
                fontWeight: '500',
                marginBottom: '24px',
              }}
            >
              HOW IT WORKS
            </span>
            <h2
              style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: '700',
                color: '#1a1a1a',
                letterSpacing: '-0.02em',
              }}
            >
              Go live in 3 simple steps
            </h2>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {[
              {
                step: '01',
                title: 'Create your profile',
                description:
                  'Sign up and tell us about yourself. Add your bio, credentials, and teaching style. Choose a template for your website.',
              },
              {
                step: '02',
                title: 'Add your content',
                description:
                  'Upload your courses, schedule live sessions, and customize your landing page. Our tools make it easy to showcase your expertise.',
              },
              {
                step: '03',
                title: 'Start teaching',
                description:
                  'Share your unique URL and start accepting students. We handle payments, hosting, and technical details so you can focus on teaching.',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '32px',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    background: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: '700',
                    color: '#fff',
                    boxShadow:
                      '0 8px 32px color-mix(in srgb, var(--color-primary) 30%, transparent)',
                  }}
                >
                  {item.step}
                </div>
                <div style={{ flex: 1, paddingTop: '8px' }}>
                  <h3
                    style={{
                      fontSize: '24px',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      marginBottom: '12px',
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: '16px',
                      lineHeight: '1.7',
                      color: '#666',
                    }}
                  >
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        style={{
          padding: '120px 24px',
          background: '#fafafa',
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <h2
              style={{
                fontSize: 'clamp(32px, 5vw, 48px)',
                fontWeight: '700',
                color: '#1a1a1a',
                letterSpacing: '-0.02em',
              }}
            >
              Loved by instructors worldwide
            </h2>
          </div>

          {/* Testimonial Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {[
              {
                quote:
                  'MyYoga.Guru transformed my teaching practice. I now reach students worldwide and earn more than I ever did with in-person classes.',
                author: 'Sarah M.',
                role: 'Vinyasa Expert',
              },
              {
                quote:
                  'The platform is incredibly easy to use. I created my first course in just a weekend and had my first students within days.',
                author: 'Michael Chen',
                role: 'Power Yoga Instructor',
              },
              {
                quote:
                  'I love the flexibility. I create content when it works for me and earn passive income 24/7. Best decision for my career.',
                author: 'Priya Sharma',
                role: 'Meditation Teacher',
              },
            ].map((testimonial, idx) => (
              <div
                key={idx}
                style={{
                  padding: '32px',
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: '20px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {/* Stars */}
                <div
                  style={{ marginBottom: '20px', color: 'var(--color-primary)', fontSize: '20px' }}
                >
                  ★★★★★
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.7',
                    color: '#444',
                    marginBottom: '24px',
                  }}
                >
                  &quot;{testimonial.quote}&quot;
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: 'var(--color-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: '600',
                      color: '#fff',
                    }}
                  >
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1a1a1a' }}>
                      {testimonial.author}
                    </div>
                    <div style={{ fontSize: '14px', color: '#888' }}>{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section
        style={{
          padding: '120px 24px',
          background: 'color-mix(in srgb, var(--color-primary-light) 15%, #fff)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%',
            height: '100%',
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--color-primary-light) 30%, transparent) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            maxWidth: '800px',
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '24px',
              letterSpacing: '-0.02em',
            }}
          >
            Ready to share your
            <br />
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--color-primary) 0%, var(--color-highlight) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              expertise with the world?
            </span>
          </h2>
          <p
            style={{
              fontSize: '20px',
              lineHeight: '1.6',
              color: '#666',
              marginBottom: '48px',
            }}
          >
            Join hundreds of yoga instructors who are building thriving online businesses.
          </p>
          <Link
            href="/auth/signup"
            style={{
              display: 'inline-block',
              padding: '20px 48px',
              background: 'var(--color-primary)',
              color: '#fff',
              fontSize: '18px',
              fontWeight: '600',
              borderRadius: '12px',
              textDecoration: 'none',
              boxShadow: '0 8px 32px color-mix(in srgb, var(--color-primary) 30%, transparent)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            Get Started Free →
          </Link>
          <p
            style={{
              marginTop: '24px',
              fontSize: '14px',
              color: '#888',
            }}
          >
            No credit card required • Free to start • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          padding: '48px 24px',
          background: '#fff',
          borderTop: '1px solid #eee',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div style={{ color: '#888', fontSize: '14px' }}>
            © {new Date().getFullYear()} MyYoga.Guru. All rights reserved.
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            {['Privacy', 'Terms', 'Contact'].map(link => (
              <a
                key={link}
                href="#"
                style={{
                  color: '#888',
                  fontSize: '14px',
                  textDecoration: 'none',
                  transition: 'color 0.2s',
                }}
              >
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
