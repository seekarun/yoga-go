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
        className="relative w-full overflow-hidden"
        style={{
          minHeight: 'min(500px, 80vh)',
        }}
      >
        {/* Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/yg_teach1.jpg"
          alt="Yoga instructor teaching"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
          }}
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
        <div className="absolute bottom-0 left-0 right-0 px-4 sm:px-6 py-8 sm:py-12">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-2xl text-white">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-5 leading-tight drop-shadow-lg">
                Looking to teach yoga online?
              </h1>
              <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 leading-relaxed drop-shadow-md">
                Get online in 5 minutes, easy as that
              </p>
              <div className="flex flex-col items-start gap-4">
                {upgradeError && (
                  <div className="px-4 py-3 bg-red-500/30 text-white rounded-lg text-sm">
                    {upgradeError}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                  {isAuthenticated ? (
                    // Authenticated learner - show upgrade button
                    <button
                      onClick={handleUpgradeToExpert}
                      disabled={upgrading}
                      className="w-full sm:w-auto px-6 sm:px-10 py-3 sm:py-4 bg-white rounded-lg text-base sm:text-lg font-semibold border-none transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      {upgrading ? 'Upgrading...' : 'Get started for free'}
                    </button>
                  ) : (
                    // Unauthenticated - show signup link
                    <Link
                      href="/auth/signup"
                      className="w-full sm:w-auto text-center px-6 sm:px-10 py-3 sm:py-4 bg-white rounded-lg text-base sm:text-lg font-semibold transition-transform hover:scale-105 shadow-lg"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      Get started for free
                    </Link>
                  )}
                  <a
                    href="#features"
                    className="w-full sm:w-auto text-center px-6 sm:px-10 py-3 sm:py-4 bg-white/10 text-white border-2 border-white rounded-lg text-base sm:text-lg font-semibold transition-transform hover:scale-105 backdrop-blur-sm"
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
      <section id="features" className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14 md:mb-16">
            Everything You Need to Succeed
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10 md:gap-14">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4 sm:mb-5">💰</div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">
                Earn More Income
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Set your own prices and keep most of what you earn. Build a sustainable income from
                your passion.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4 sm:mb-5">🌍</div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">
                Global Reach
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Teach students from around the world. No geographic limitations on your impact.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4 sm:mb-5">🤝</div>
              <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3">
                Expert Support
              </h3>
              <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                Get dedicated support to help you succeed and grow your online yoga business.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14 md:mb-16">
            Get Started in 3 Simple Steps
          </h2>

          <div className="flex flex-col gap-8 sm:gap-10">
            {/* Step 1 */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-8">
              <div
                className="flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center text-xl sm:text-3xl font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                1
              </div>
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">
                  Create Your Expert Profile
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Sign up and tell us about your expertise, certifications, and teaching style.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-8">
              <div
                className="flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center text-xl sm:text-3xl font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                2
              </div>
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">
                  Build Your First Course
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Upload videos, organize lessons, and create a comprehensive learning experience.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex items-start sm:items-center gap-4 sm:gap-8">
              <div
                className="flex-shrink-0 w-14 h-14 sm:w-20 sm:h-20 rounded-full text-white flex items-center justify-center text-xl sm:text-3xl font-bold"
                style={{ background: 'var(--color-primary)' }}
              >
                3
              </div>
              <div>
                <h3 className="text-lg sm:text-xl md:text-2xl font-semibold mb-1 sm:mb-2">
                  Start Earning
                </h3>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  Publish your course and watch as students enroll and your income grows.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14 md:mb-16">
            Trusted by Expert Instructors
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Testimonial 1 */}
            <div className="bg-gray-50 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-5 leading-relaxed">
                &quot;Yoga-GO has transformed my teaching practice. I now reach students worldwide
                and earn more than I ever did with in-person classes.&quot;
              </p>
              <p
                className="text-xs sm:text-sm font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                - Sarah M., Vinyasa Expert
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-gray-50 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-5 leading-relaxed">
                &quot;The platform is incredibly easy to use. I created my first course in just a
                weekend and had my first students within days.&quot;
              </p>
              <p
                className="text-xs sm:text-sm font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                - Michael Chen, Power Yoga Instructor
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-gray-50 rounded-xl p-6 sm:p-8 shadow-sm">
              <div className="text-3xl sm:text-4xl mb-3 sm:mb-4">⭐⭐⭐⭐⭐</div>
              <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-5 leading-relaxed">
                &quot;I love the flexibility. I create content when it works for me and earn passive
                income 24/7. Best decision for my career.&quot;
              </p>
              <p
                className="text-xs sm:text-sm font-semibold"
                style={{ color: 'var(--color-primary)' }}
              >
                - Priya Sharma, Meditation Teacher
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-16 sm:py-20 md:py-24 px-4 sm:px-6 text-center text-white"
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold mb-4 sm:mb-6">
            Ready to Share Your Expertise?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-8 sm:mb-10 opacity-95">
            Join the Yoga-GO expert community today and start building your online yoga business.
          </p>
          <Link
            href="/auth/signin?callbackUrl=/srv"
            className="inline-block px-8 sm:px-12 py-3 sm:py-4 bg-white rounded-lg text-base sm:text-lg font-semibold transition-transform hover:scale-105"
            style={{ color: 'var(--color-primary)' }}
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
