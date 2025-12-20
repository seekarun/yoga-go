import type { SectionPreviewProps } from '../types';

export default function HeroPreview({
  data,
  expertName,
  expertBio,
  template = 'classic',
}: SectionPreviewProps) {
  const customHero = data.hero;
  const heroHeadline =
    customHero?.headline || `Transform Your Practice with ${expertName || 'Expert'}`;
  const heroDescription =
    customHero?.description || expertBio || 'Your expert bio will appear here';
  const heroCtaText = customHero?.ctaText || 'Explore Courses';
  const heroImage = customHero?.heroImage;
  const heroAlignment = customHero?.alignment || 'center';

  const isModern = template === 'modern';

  // Modern template - Split layout with image on right
  if (isModern) {
    return (
      <section
        style={{
          minHeight: '500px',
          background: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient blob */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '50%',
            height: '140%',
            background:
              'radial-gradient(ellipse at center, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '500px',
            maxWidth: '1200px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left - Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              padding: '60px 40px 60px 60px',
            }}
          >
            {/* Small label */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '24px',
              }}
            >
              <span
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #6366f1, #a855f7)',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: '#a855f7',
                }}
              >
                Welcome
              </span>
            </div>

            <h1
              style={{
                fontSize: '48px',
                fontWeight: '800',
                lineHeight: '1.1',
                marginBottom: '24px',
                color: '#fff',
                letterSpacing: '-0.03em',
              }}
            >
              {heroHeadline}
            </h1>

            <p
              style={{
                fontSize: '18px',
                lineHeight: '1.7',
                color: 'rgba(255, 255, 255, 0.7)',
                marginBottom: '40px',
                maxWidth: '480px',
              }}
            >
              {heroDescription}
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                }}
              >
                {heroCtaText}
              </span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                <span
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ▶
                </span>
                Watch Intro
              </span>
            </div>

            {/* Stats */}
            <div
              style={{
                display: 'flex',
                gap: '40px',
                marginTop: '60px',
                paddingTop: '40px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {[
                { value: '500+', label: 'Students' },
                { value: '50+', label: 'Classes' },
                { value: '4.9', label: 'Rating' },
              ].map((stat, i) => (
                <div key={i}>
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: '700',
                      color: '#fff',
                      marginBottom: '4px',
                    }}
                  >
                    {stat.value}
                  </div>
                  <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Image */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px',
            }}
          >
            {/* Decorative ring */}
            <div
              style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: '50%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '340px',
                height: '340px',
                border: '1px solid rgba(168, 85, 247, 0.15)',
                borderRadius: '50%',
              }}
            />

            {/* Main image */}
            <div
              style={{
                width: '320px',
                height: '400px',
                borderRadius: '200px',
                overflow: 'hidden',
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                background: heroImage
                  ? `url(${heroImage}) center/cover`
                  : 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
              }}
            />

            {/* Floating card */}
            <div
              style={{
                position: 'absolute',
                bottom: '60px',
                right: '20px',
                background: 'rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '16px 20px',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>Next Class</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
                Tomorrow, 8:00 AM
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Classic template - Original centered layout
  return (
    <section
      style={{
        minHeight: '400px',
        position: 'relative',
        background: heroImage
          ? `url(${heroImage})`
          : 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        overflow: 'hidden',
      }}
    >
      {/* Gradient Overlay */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: heroImage
            ? 'rgba(0, 0, 0, 0.5)'
            : 'radial-gradient(circle at 20% 50%, rgba(118, 75, 162, 0.2) 0%, transparent 50%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          height: '100%',
          minHeight: '400px',
          display: 'flex',
          flexDirection: 'column',
          alignItems:
            heroAlignment === 'left'
              ? 'flex-start'
              : heroAlignment === 'right'
                ? 'flex-end'
                : 'center',
          justifyContent: 'center',
          padding: '40px 20px',
          textAlign: heroAlignment === 'center' ? 'center' : heroAlignment,
        }}
      >
        <div
          style={{
            zIndex: 10,
            maxWidth: heroAlignment === 'center' ? '600px' : '400px',
            width: heroAlignment === 'center' ? '100%' : '60%',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              lineHeight: '1.1',
              marginBottom: '16px',
              color: '#fff',
              letterSpacing: '-0.02em',
              whiteSpace: 'pre-line',
            }}
          >
            {heroHeadline}
          </h1>

          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.6',
              color: 'rgba(255, 255, 255, 0.85)',
              marginLeft: heroAlignment === 'center' ? 'auto' : '0',
              marginRight: heroAlignment === 'center' ? 'auto' : '0',
              marginBottom: '24px',
            }}
          >
            {heroDescription}
          </p>

          {/* CTA Button */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              justifyContent: heroAlignment,
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '10px 24px',
                background: '#fcd34d',
                color: '#1f2937',
                fontSize: '12px',
                fontWeight: '600',
                borderRadius: '6px',
              }}
            >
              {heroCtaText}
            </span>
          </div>
        </div>
      </div>

      {/* Decorative gradient at bottom */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '100%',
          height: '60px',
          background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)',
          pointerEvents: 'none',
        }}
      />
    </section>
  );
}
