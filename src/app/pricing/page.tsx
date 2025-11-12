'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePayment } from '@/contexts/PaymentContext';
import { PAYMENT_CONFIG } from '@/config/payment';
import { formatPrice } from '@/lib/geolocation';
import PaymentModal from '@/components/payment/PaymentModal';
import { posthog } from '@/providers/PostHogProvider';

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    role: 'Yoga Enthusiast',
    content:
      'The Committed plan has been a game-changer for me. Having access to all courses means I can explore different styles and find what works best for my body.',
    avatar: 'https://i.pravatar.cc/150?img=1',
    rating: 5,
  },
  {
    id: 2,
    name: 'Michael Chen',
    role: 'Beginner Yogi',
    content:
      'Started with the Curious plan to dip my toes in. The monthly course token is perfect for my pace, and the yearly subscription saves me so much money!',
    avatar: 'https://i.pravatar.cc/150?img=13',
    rating: 5,
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    role: 'Advanced Practitioner',
    content:
      'I love the flexibility of pay-as-you-go. I can pick exactly which courses I want without any commitment. Perfect for my busy schedule.',
    avatar: 'https://i.pravatar.cc/150?img=5',
    rating: 5,
  },
  {
    id: 4,
    name: 'David Park',
    role: 'Wellness Coach',
    content:
      'The Committed plan gives me everything I need to guide my clients. The variety of expert-led courses is incredible and worth every penny.',
    avatar: 'https://i.pravatar.cc/150?img=12',
    rating: 5,
  },
  {
    id: 5,
    name: 'Lisa Thompson',
    role: 'Yoga Teacher',
    content:
      'As a teacher, I use the Committed plan to stay updated with different teaching styles. The content is top-notch and always inspiring.',
    avatar: 'https://i.pravatar.cc/150?img=9',
    rating: 5,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const { currency, loading: locationLoading } = usePayment();
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'curious' | 'committed' | null>(null);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('yearly');
  const [selectedInterval, setSelectedInterval] = useState<'monthly' | 'yearly'>('yearly');

  // Track pricing page view
  useEffect(() => {
    posthog.capture('pricing_page_viewed', {
      currency,
      defaultInterval: 'yearly',
    });
  }, []); // Only track once on mount

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 400;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handlePlanSelect = (plan: 'curious' | 'committed') => {
    // Track plan selection
    const planPrice = plan === 'curious' ? curiousPrice : committedPrice;
    posthog.capture('plan_selected', {
      plan,
      billingInterval,
      currency,
      amount: planPrice,
    });

    setSelectedPlan(plan);
    setSelectedInterval(billingInterval);
    setShowPaymentModal(true);
  };

  const handleBrowseCourses = () => {
    router.push('/courses');
  };

  // Get localized pricing based on billing interval
  const curiousPrice =
    currency === 'INR'
      ? PAYMENT_CONFIG.plans.curious[billingInterval].inr
      : PAYMENT_CONFIG.plans.curious[billingInterval].usd;
  const committedPrice =
    currency === 'INR'
      ? PAYMENT_CONFIG.plans.committed[billingInterval].inr
      : PAYMENT_CONFIG.plans.committed[billingInterval].usd;

  // Calculate effective monthly rate for yearly plans (for display)
  const curiousMonthlyRate =
    billingInterval === 'yearly' ? Math.round(curiousPrice / 12) : curiousPrice;
  const committedMonthlyRate =
    billingInterval === 'yearly' ? Math.round(committedPrice / 12) : committedPrice;

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#fff' }}>
      {/* Hero Section */}
      <section
        style={{
          background:
            'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
          color: '#fff',
          padding: '80px 20px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: '48px',
              fontWeight: '700',
              marginBottom: '16px',
              lineHeight: '1.2',
            }}
          >
            Choose Your Path
          </h1>
          <p
            style={{
              fontSize: '18px',
              opacity: 0.95,
              lineHeight: '1.6',
            }}
          >
            Flexible pricing options designed to fit your yoga journey
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '80px 20px', background: '#f8f8f8' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Billing Interval Toggle */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '48px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                background: '#fff',
                borderRadius: '12px',
                padding: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                gap: '4px',
              }}
            >
              <button
                onClick={() => {
                  posthog.capture('billing_interval_toggled', {
                    from: billingInterval,
                    to: 'monthly',
                    currency,
                  });
                  setBillingInterval('monthly');
                }}
                style={{
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: billingInterval === 'monthly' ? '#764ba2' : 'transparent',
                  color: billingInterval === 'monthly' ? '#fff' : '#4a5568',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Monthly
              </button>
              <button
                onClick={() => {
                  posthog.capture('billing_interval_toggled', {
                    from: billingInterval,
                    to: 'yearly',
                    currency,
                  });
                  setBillingInterval('yearly');
                }}
                style={{
                  padding: '12px 32px',
                  borderRadius: '8px',
                  border: 'none',
                  background: billingInterval === 'yearly' ? '#764ba2' : 'transparent',
                  color: billingInterval === 'yearly' ? '#fff' : '#4a5568',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                Yearly
                <span
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: '#48bb78',
                    color: '#fff',
                    padding: '2px 8px',
                    borderRadius: '100px',
                    fontSize: '11px',
                    fontWeight: '600',
                  }}
                >
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              alignItems: 'stretch',
            }}
          >
            {/* Pay-as-you-go */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '40px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Pay-as-you-go
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '24px',
                }}
              >
                Perfect for exploring
              </div>
              <div style={{ marginBottom: '32px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: '700',
                    color: 'var(--color-primary)',
                    marginBottom: '8px',
                  }}
                >
                  Full Price
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>Pay per course</div>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 32px 0',
                  flex: 1,
                }}
              >
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Access to all courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Lifetime access to purchased courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>No commitment required</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Certificate of completion</span>
                </li>
              </ul>
              <button
                onClick={handleBrowseCourses}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#fff',
                  color: 'var(--color-primary)',
                  border: '2px solid var(--color-primary)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--color-primary)';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = 'var(--color-primary)';
                }}
              >
                Browse Courses
              </button>
            </div>

            {/* Curious - Popular */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '40px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                border: '2px solid var(--color-primary)',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--color-primary)',
                  color: '#fff',
                  padding: '4px 16px',
                  borderRadius: '100px',
                  fontSize: '12px',
                  fontWeight: '600',
                }}
              >
                POPULAR
              </div>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Curious
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '24px',
                }}
              >
                For dedicated learners
              </div>
              <div style={{ marginBottom: '32px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: '700',
                    color: 'var(--color-primary)',
                    marginBottom: '8px',
                  }}
                >
                  {locationLoading ? '...' : formatPrice(curiousPrice, currency)}
                  <span style={{ fontSize: '18px', color: '#666', fontWeight: '400' }}>
                    /{billingInterval === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {billingInterval === 'yearly'
                    ? `~${formatPrice(curiousMonthlyRate, currency)}/mo · Billed annually`
                    : '12 course tokens per year (1 per month)'}
                </div>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 32px 0',
                  flex: 1,
                }}
              >
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>12 course tokens per year</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Lifetime access to redeemed courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Priority support</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Certificate of completion</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: 'var(--color-highlight)', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Exclusive community access</span>
                </li>
              </ul>
              <button
                onClick={() => handlePlanSelect('curious')}
                disabled={locationLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: locationLoading ? '#ccc' : 'var(--color-primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: locationLoading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => {
                  if (!locationLoading) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  if (!locationLoading) e.currentTarget.style.opacity = '1';
                }}
              >
                {locationLoading ? 'Loading...' : 'Get Started'}
              </button>
            </div>

            {/* Committed */}
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                padding: '40px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                Committed
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#666',
                  marginBottom: '24px',
                }}
              >
                For serious practitioners
              </div>
              <div style={{ marginBottom: '32px' }}>
                <div
                  style={{
                    fontSize: '48px',
                    fontWeight: '700',
                    color: '#764ba2',
                    marginBottom: '8px',
                  }}
                >
                  {locationLoading ? '...' : formatPrice(committedPrice, currency)}
                  <span
                    style={{
                      fontSize: '18px',
                      color: '#666',
                      fontWeight: '400',
                    }}
                  >
                    /{billingInterval === 'monthly' ? 'month' : 'year'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>
                  {billingInterval === 'yearly'
                    ? `~${formatPrice(committedMonthlyRate, currency)}/mo · Billed annually`
                    : 'Unlimited access to everything'}
                </div>
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 32px 0',
                  flex: 1,
                }}
              >
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>All courses included</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Unlimited streaming access</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Early access to new courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Priority support</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Certificate of completion</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Exclusive community access</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Monthly live Q&A with experts</span>
                </li>
              </ul>
              <button
                onClick={() => handlePlanSelect('committed')}
                disabled={locationLoading}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: locationLoading ? '#ccc' : '#764ba2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: locationLoading ? 'not-allowed' : 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => {
                  if (!locationLoading) e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  if (!locationLoading) e.currentTarget.style.opacity = '1';
                }}
              >
                {locationLoading ? 'Loading...' : 'Get Started'}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section style={{ padding: '80px 20px', background: '#fff' }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '36px',
                  fontWeight: '600',
                  marginBottom: '8px',
                }}
              >
                What Our Members Say
              </h2>
              <p style={{ fontSize: '16px', color: '#666' }}>
                Join thousands of satisfied yoga practitioners
              </p>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => scroll(testimonialsScrollRef, 'left')}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f7fafc';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                <svg width="20" height="20" fill="#4a5568" viewBox="0 0 24 24">
                  <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
                </svg>
              </button>
              <button
                onClick={() => scroll(testimonialsScrollRef, 'right')}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f7fafc';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                }}
              >
                <svg width="20" height="20" fill="#4a5568" viewBox="0 0 24 24">
                  <path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Testimonials Scroll Container */}
          <div
            ref={testimonialsScrollRef}
            style={{
              display: 'flex',
              gap: '24px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              padding: '4px',
            }}
          >
            {testimonials.map(testimonial => (
              <div
                key={testimonial.id}
                style={{
                  background: '#f8f8f8',
                  borderRadius: '12px',
                  padding: '32px',
                  minWidth: '380px',
                  flex: '0 0 380px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Stars */}
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <span key={i} style={{ color: '#FFB800', fontSize: '20px' }}>
                      ★
                    </span>
                  ))}
                </div>

                {/* Content */}
                <p
                  style={{
                    fontSize: '16px',
                    color: '#4a5568',
                    lineHeight: '1.6',
                    marginBottom: '24px',
                    flex: 1,
                  }}
                >
                  &ldquo;{testimonial.content}&rdquo;
                </p>

                {/* Author */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundImage: `url(${testimonial.avatar})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  />
                  <div>
                    <div style={{ fontWeight: '600', marginBottom: '2px' }}>{testimonial.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section style={{ padding: '80px 20px', background: '#f8f8f8' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2
            style={{
              fontSize: '36px',
              fontWeight: '600',
              marginBottom: '40px',
              textAlign: 'center',
            }}
          >
            Frequently Asked Questions
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Can I switch plans later?
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                Yes! You can upgrade or downgrade your plan at any time. Changes will take effect at
                the start of your next billing cycle.
              </p>
            </div>
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                What happens to unused course tokens?
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                Unused course tokens roll over to the next month as long as your subscription
                remains active. They do not expire!
              </p>
            </div>
            <div
              style={{
                background: '#fff',
                borderRadius: '12px',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>
                Is there a refund policy?
              </h3>
              <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                We offer a 30-day money-back guarantee on all subscription plans. If you&apos;re not
                satisfied, contact us for a full refund.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Payment Modal */}
      {selectedPlan && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          type="subscription"
          item={{
            id: selectedPlan,
            title: PAYMENT_CONFIG.plans[selectedPlan].name,
            planType: selectedPlan,
            billingInterval: selectedInterval,
          }}
        />
      )}
    </div>
  );
}
