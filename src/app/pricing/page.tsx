'use client';

import { useRef } from 'react';

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
  const testimonialsScrollRef = useRef<HTMLDivElement>(null);

  const scroll = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = 400;
      ref.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#fff' }}>
      {/* Hero Section */}
      <section
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
                    color: '#764ba2',
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
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Access to all courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Lifetime access to purchased courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>No commitment required</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Certificate of completion</span>
                </li>
              </ul>
              <button
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#fff',
                  color: '#764ba2',
                  border: '2px solid #764ba2',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#764ba2';
                  e.currentTarget.style.color = '#fff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.color = '#764ba2';
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
                border: '2px solid #764ba2',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: '#764ba2',
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
                    color: '#764ba2',
                    marginBottom: '8px',
                  }}
                >
                  $299
                  <span style={{ fontSize: '18px', color: '#666', fontWeight: '400' }}>/year</span>
                </div>
                <div style={{ fontSize: '14px', color: '#666' }}>One course token per month</div>
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
                  <span style={{ color: '#4a5568' }}>12 course tokens per year</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ color: '#48bb78', fontSize: '20px' }}>✓</span>
                  <span style={{ color: '#4a5568' }}>Lifetime access to redeemed courses</span>
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
              </ul>
              <button
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#764ba2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Get Started
              </button>
            </div>

            {/* Committed */}
            <div
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '16px',
                padding: '40px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                display: 'flex',
                flexDirection: 'column',
                color: '#fff',
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
                  color: 'rgba(255,255,255,0.9)',
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
                    marginBottom: '8px',
                  }}
                >
                  $599
                  <span
                    style={{
                      fontSize: '18px',
                      color: 'rgba(255,255,255,0.9)',
                      fontWeight: '400',
                    }}
                  >
                    /year
                  </span>
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                  Unlimited access to everything
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
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>All courses included</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>Unlimited streaming access</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>Early access to new courses</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>Priority support</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>Certificate of completion</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>Exclusive community access</span>
                </li>
                <li style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>✓</span>
                  <span>Monthly live Q&A with experts</span>
                </li>
              </ul>
              <button
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#fff',
                  color: '#764ba2',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                Go Premium
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
    </div>
  );
}
