'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import ExpertOnboarding from '@/components/ExpertOnboarding';
import ExpertDashboard from '@/components/ExpertDashboard';
import type { Expert } from '@/types';

export default function ExpertPlatform() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [expertProfile, setExpertProfile] = useState<Expert | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only fetch expert profile if user is authenticated and is an expert
    if (isAuthenticated && user?.role === 'expert') {
      fetchExpertProfile();
    } else {
      setLoading(false);
    }
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

  // Case 2: User is authenticated but is a learner
  if (user?.role === 'learner') {
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
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: '600', marginBottom: '16px' }}>
            Looking to teach on Yoga-GO?
          </h1>
          <p style={{ fontSize: '16px', color: '#666', marginBottom: '24px' }}>
            This area is for yoga experts who want to create and sell courses.
          </p>
          <p style={{ fontSize: '14px', color: '#999' }}>
            To become an expert, please contact support or create a new account with an expert role.
          </p>
          <div style={{ marginTop: '32px' }}>
            <Link
              href="/app"
              style={{
                padding: '12px 24px',
                background: '#764ba2',
                color: '#fff',
                borderRadius: '8px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Case 3: User is expert but profile doesn't exist - Show Onboarding
  if (user?.role === 'expert' && !expertProfile) {
    return (
      <div style={{ paddingTop: '64px' }}>
        <ExpertOnboarding userEmail={user.profile.email} userName={user.profile.name} />
      </div>
    );
  }

  // Case 4: User is expert with completed profile - Show Dashboard
  if (user?.role === 'expert' && expertProfile) {
    return (
      <div style={{ paddingTop: '64px' }}>
        <ExpertDashboard expert={expertProfile} />
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

// SaaS Landing Page for unauthenticated users
function ExpertLandingPage() {
  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh' }}>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
          padding: '120px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: '56px',
              fontWeight: '700',
              marginBottom: '24px',
              lineHeight: '1.2',
            }}
          >
            Build Your Yoga Business Online
          </h1>
          <p
            style={{
              fontSize: '20px',
              marginBottom: '40px',
              opacity: 0.95,
              lineHeight: '1.6',
              maxWidth: '700px',
              margin: '0 auto 40px',
            }}
          >
            Share your expertise, reach students worldwide, and earn income doing what you love.
            Join hundreds of yoga instructors building thriving online practices.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/api/auth/login?returnTo=/srv"
              style={{
                padding: '16px 40px',
                background: '#fff',
                color: '#764ba2',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s',
              }}
            >
              Start Teaching Today
            </Link>
            <a
              href="#features"
              style={{
                padding: '16px 40px',
                background: 'transparent',
                color: '#fff',
                border: '2px solid #fff',
                borderRadius: '8px',
                fontSize: '18px',
                fontWeight: '600',
                textDecoration: 'none',
                display: 'inline-block',
                transition: 'transform 0.2s',
              }}
            >
              Learn More
            </a>
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
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '40px',
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
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>⏰</div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Full Flexibility
              </h3>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                Create courses on your schedule. Record once and earn passive income forever.
              </p>
            </div>

            {/* Feature 4 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>📊</div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Deep Analytics
              </h3>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                Track student progress, engagement, and revenue with powerful analytics tools.
              </p>
            </div>

            {/* Feature 5 */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎥</div>
              <h3 style={{ fontSize: '24px', fontWeight: '600', marginBottom: '12px' }}>
                Easy Course Creation
              </h3>
              <p style={{ fontSize: '16px', color: '#666', lineHeight: '1.6' }}>
                Upload videos, organize lessons, and publish courses with our intuitive platform.
              </p>
            </div>

            {/* Feature 6 */}
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
                  background: '#764ba2',
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
                  background: '#764ba2',
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
                  background: '#764ba2',
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
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#764ba2' }}>
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
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#764ba2' }}>
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
              <p style={{ fontSize: '14px', fontWeight: '600', color: '#764ba2' }}>
                - Priya Sharma, Meditation Teacher
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
            href="/api/auth/login?returnTo=/srv"
            style={{
              padding: '16px 48px',
              background: '#fff',
              color: '#764ba2',
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
