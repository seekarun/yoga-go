import type { SectionPreviewProps } from '../types';

export default function HeroPreview({ data, expertName, expertBio }: SectionPreviewProps) {
  const customHero = data.hero;
  const heroHeadline =
    customHero?.headline || `Transform Your Practice with ${expertName || 'Expert'}`;
  const heroDescription =
    customHero?.description || expertBio || 'Your expert bio will appear here';
  const heroCtaText = customHero?.ctaText || 'Explore Courses';
  const heroImage = customHero?.heroImage;
  const heroAlignment = customHero?.alignment || 'center';

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
              marginBottom: '24px',
              color: 'rgba(255, 255, 255, 0.85)',
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
