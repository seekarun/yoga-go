import type { SectionPreviewProps } from '../types';

export default function ActPreview({ data, template = 'classic' }: SectionPreviewProps) {
  const act = data.act;
  const heroCtaText = data.hero?.ctaText || 'Get Your Results';
  const isModern = template === 'modern';

  // Don't render if no content
  if (!act || (!act.imageUrl && !act.title && !act.text)) {
    return (
      <section
        style={{
          padding: isModern ? '80px 40px' : '40px 20px',
          background: isModern ? '#0a0a0a' : '#333',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No call-to-action section configured. Click to add content.
        </p>
      </section>
    );
  }

  // Modern template - Full-width gradient CTA
  if (isModern) {
    return (
      <section
        style={{
          padding: '100px 40px',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #111 50%, #0a0a0a 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Animated gradient background - uses brand color */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '150%',
            height: '150%',
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-500) 15%, transparent) 0%, transparent 50%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Glass card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(20px)',
              borderRadius: '32px',
              padding: '60px',
              border: '1px solid rgba(255,255,255,0.1)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            {/* Left - Content */}
            <div>
              {/* Badge - uses brand color */}
              <div
                style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: 'var(--brand-100)',
                  borderRadius: '50px',
                  marginBottom: '24px',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: 'var(--brand-700)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Limited Time Offer
                </span>
              </div>

              <h2
                style={{
                  fontSize: '40px',
                  fontWeight: '800',
                  lineHeight: '1.15',
                  marginBottom: '20px',
                  color: '#fff',
                  letterSpacing: '-0.02em',
                }}
              >
                {act.title || 'Ready to Start Your Journey?'}
              </h2>

              <p
                style={{
                  fontSize: '18px',
                  lineHeight: '1.7',
                  color: 'rgba(255,255,255,0.6)',
                  marginBottom: '32px',
                }}
              >
                {act.text ||
                  'Join thousands of students who have transformed their practice. Start your journey today.'}
              </p>

              {/* CTA Buttons - uses brand gradient */}
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '18px 36px',
                    background:
                      'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                    color: 'var(--brand-500-contrast)',
                    fontSize: '16px',
                    fontWeight: '600',
                    borderRadius: '12px',
                    boxShadow: '0 8px 30px color-mix(in srgb, var(--brand-500) 40%, transparent)',
                  }}
                >
                  {heroCtaText}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '18px 24px',
                    color: 'rgba(255,255,255,0.7)',
                    fontSize: '16px',
                    fontWeight: '500',
                  }}
                >
                  Learn More →
                </span>
              </div>

              {/* Trust indicators */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '24px',
                  marginTop: '40px',
                  paddingTop: '32px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                    30-day guarantee
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#22c55e', fontSize: '18px' }}>✓</span>
                  <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
                    Lifetime access
                  </span>
                </div>
              </div>
            </div>

            {/* Right - Image */}
            <div style={{ position: 'relative' }}>
              {act.imageUrl ? (
                <img
                  src={act.imageUrl}
                  alt={act.title || 'CTA Image'}
                  style={{
                    width: '100%',
                    height: '400px',
                    objectFit: 'cover',
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '400px',
                    background: 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: '#6b7280', fontSize: '14px' }}>No image uploaded</span>
                </div>
              )}

              {/* Floating discount badge - uses brand color gradient */}
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'linear-gradient(135deg, var(--brand-400) 0%, var(--brand-600) 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 10px 30px color-mix(in srgb, var(--brand-600) 40%, transparent)',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    fontWeight: '800',
                    color: 'var(--brand-500-contrast)',
                  }}
                >
                  20%
                </span>
                <span
                  style={{ fontSize: '12px', color: 'var(--brand-500-contrast)', opacity: 0.9 }}
                >
                  OFF
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Classic template - Original layout
  return (
    <section style={{ padding: '40px 20px', background: '#333' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '32px',
            alignItems: 'center',
          }}
        >
          {/* Left: Image */}
          <div
            style={{
              width: '100%',
              height: '200px',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {act.imageUrl ? (
              <img
                src={act.imageUrl}
                alt={act.title || 'Act section'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background: '#4b5563',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <span style={{ color: '#9ca3af', fontSize: '12px' }}>No image uploaded</span>
              </div>
            )}
          </div>

          {/* Right: Content */}
          <div>
            <h2
              style={{
                fontSize: '24px',
                fontWeight: '700',
                marginBottom: '12px',
                color: '#fff',
                lineHeight: '1.2',
              }}
            >
              {act.title || "Let's uncover the power of your brand."}
            </h2>
            <p
              style={{
                fontSize: '13px',
                lineHeight: '1.7',
                color: '#d1d5db',
                marginBottom: '20px',
              }}
            >
              {act.text ||
                'Take the guesswork out of your branding and marketing today with this rapid questionnaire.'}
            </p>
            {/* CTA button - uses brand color */}
            <span
              style={{
                padding: '10px 24px',
                background: 'var(--brand-500)',
                color: 'var(--brand-500-contrast)',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                display: 'inline-block',
              }}
            >
              {heroCtaText}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
