import { UnsplashAttribution } from '../../shared';
import type { HeroSectionProps } from '../../types';

interface ClassicHeroSectionProps extends HeroSectionProps {
  resolveCtaLink: (link: string | undefined) => string;
}

export default function HeroSection({
  heroImage,
  heroImageAttribution,
  headline,
  description,
  ctaText,
  ctaLink,
  alignment,
  expertName,
  resolveCtaLink,
}: ClassicHeroSectionProps) {
  const hasCustomHeadline = headline !== `Transform Your\nPractice with ${expertName}`;

  return (
    <>
      {/* Desktop Hero Section */}
      <section
        className="hero-section-desktop"
        style={{
          minHeight: '600px',
          paddingTop: '64px',
          position: 'relative',
          backgroundImage: heroImage
            ? `url(${heroImage})`
            : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient for non-image hero */}
        {!heroImage && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background:
                'radial-gradient(circle at 20% 50%, color-mix(in srgb, var(--brand-500) 20%, transparent) 0%, transparent 50%)',
              pointerEvents: 'none',
            }}
          />
        )}

        <div
          className="container"
          style={{
            position: 'relative',
            height: '100%',
            minHeight: '600px',
            display: 'flex',
            flexDirection: 'column',
            alignItems:
              alignment === 'left' ? 'flex-start' : alignment === 'right' ? 'flex-end' : 'center',
            justifyContent: 'center',
            padding: '0 20px 80px 20px',
            textAlign: alignment === 'center' ? 'center' : alignment,
          }}
        >
          <div
            style={{
              zIndex: 10,
              maxWidth: alignment === 'center' ? '900px' : '600px',
              width: alignment === 'center' ? '100%' : '50%',
            }}
          >
            <h1
              style={{
                fontSize: '64px',
                fontWeight: '700',
                lineHeight: '1.1',
                marginBottom: '24px',
                color: '#fff',
                letterSpacing: '-0.02em',
                whiteSpace: 'pre-line',
                textShadow: '0 2px 4px rgba(0,0,0,0.5), 0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              {hasCustomHeadline ? (
                headline
              ) : (
                <>
                  Transform Your
                  <br />
                  <span
                    style={{
                      background:
                        'linear-gradient(135deg, var(--brand-400, #9ca3af) 0%, var(--brand-500, #6b7280) 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Practice
                  </span>{' '}
                  with {expertName}
                </>
              )}
            </h1>

            <p
              style={{
                fontSize: '26px',
                lineHeight: '1.6',
                marginBottom: '40px',
                color: 'rgba(255, 255, 255, 0.95)',
                textShadow: '0 1px 3px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {description}
            </p>

            {/* CTA Button */}
            <div
              style={{
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                justifyContent: alignment,
              }}
            >
              <a
                href={resolveCtaLink(ctaLink)}
                className="hero-cta-button"
                style={{
                  display: 'inline-block',
                  padding: '16px 48px',
                  background: 'var(--brand-500, #fcd34d)',
                  color: 'var(--brand-500-contrast, #1f2937)',
                  fontSize: '18px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'transform 0.2s, background 0.2s, box-shadow 0.2s',
                  boxShadow: '0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.background = 'var(--brand-600, #fbbf24)';
                  e.currentTarget.style.boxShadow =
                    '0 0 25px rgba(255,255,255,0.5), 0 0 50px rgba(255,255,255,0.3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.background = 'var(--brand-500, #fcd34d)';
                  e.currentTarget.style.boxShadow =
                    '0 0 20px rgba(255,255,255,0.4), 0 0 40px rgba(255,255,255,0.2)';
                }}
              >
                {ctaText}
              </a>
            </div>
          </div>
        </div>

        {/* Decorative Elements */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '100px',
            background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
            pointerEvents: 'none',
          }}
        />

        {heroImageAttribution && <UnsplashAttribution attribution={heroImageAttribution} />}
      </section>

      {/* Mobile Hero Section */}
      <section className="hero-section-mobile" style={{ display: 'none', paddingTop: '64px' }}>
        {/* Hero Image */}
        {heroImage ? (
          <div style={{ width: '100%', height: '300px', overflow: 'hidden' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={heroImage}
              alt={expertName}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
              }}
            />
          </div>
        ) : (
          <div
            style={{
              width: '100%',
              height: '300px',
              background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
            }}
          />
        )}

        {/* Content Below Image */}
        <div
          style={{
            padding: '40px 20px',
            background: '#fff',
            textAlign: 'center',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              lineHeight: '1.2',
              marginBottom: '20px',
              color: '#1a202c',
              letterSpacing: '-0.02em',
            }}
          >
            {hasCustomHeadline ? headline : <>Transform Your Practice with {expertName}</>}
          </h1>

          <p
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '32px',
              color: '#4a5568',
            }}
          >
            {description}
          </p>

          {/* CTA Buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <a
              href={resolveCtaLink(ctaLink)}
              className="hero-cta-button"
              style={{
                display: 'inline-block',
                padding: '14px 32px',
                background: 'var(--brand-500, #fcd34d)',
                color: 'var(--brand-500-contrast, #1f2937)',
                fontSize: '16px',
                fontWeight: '600',
                borderRadius: '8px',
                textDecoration: 'none',
                transition: 'transform 0.2s, background 0.2s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.background = 'var(--brand-600, #fbbf24)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.background = 'var(--brand-500, #fcd34d)';
              }}
            >
              {ctaText}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
