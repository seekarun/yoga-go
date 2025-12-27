import { UnsplashAttribution, SECTION_MAX_WIDTH } from '../../shared';
import type { HeroSectionProps } from '../../types';

interface ModernHeroSectionProps extends HeroSectionProps {
  resolveCtaLink: (link: string | undefined) => string;
}

export default function HeroSection({
  heroImage,
  heroImagePosition = '50% 50%',
  heroImageZoom = 100,
  heroImageAttribution,
  headline,
  description,
  ctaText,
  ctaLink,
  stats,
  resolveCtaLink,
}: ModernHeroSectionProps) {
  return (
    <>
      {/* Desktop Modern Hero */}
      <section
        className="hero-section-desktop"
        style={{
          minHeight: '600px',
          paddingTop: '64px',
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
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-500) 15%, transparent) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            minHeight: '600px',
            maxWidth: SECTION_MAX_WIDTH,
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
            <h1
              style={{
                fontSize: '48px',
                fontWeight: '800',
                lineHeight: '1.1',
                marginBottom: '24px',
                color: '#fff',
                letterSpacing: '-0.03em',
                whiteSpace: 'pre-line',
              }}
            >
              {headline}
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
              {description}
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <a
                href={resolveCtaLink(ctaLink)}
                style={{
                  display: 'inline-block',
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                  color: 'var(--brand-500-contrast)',
                  fontSize: '14px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px color-mix(in srgb, var(--brand-500) 40%, transparent)',
                  textDecoration: 'none',
                }}
              >
                {ctaText}
              </a>
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
                { value: `${stats.totalStudents}+`, label: 'Students' },
                { value: `${stats.totalCourses}+`, label: 'Courses' },
                // Only show rating if there are actual ratings
                ...(stats.totalRatings && stats.totalRatings > 0
                  ? [{ value: stats.rating.toFixed(1), label: 'Rating' }]
                  : []),
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
            {/* Decorative rings */}
            <div
              style={{
                position: 'absolute',
                width: '400px',
                height: '400px',
                border: '1px solid color-mix(in srgb, var(--brand-500) 20%, transparent)',
                borderRadius: '50%',
              }}
            />
            <div
              style={{
                position: 'absolute',
                width: '340px',
                height: '340px',
                border: '1px solid color-mix(in srgb, var(--brand-600) 15%, transparent)',
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
                backgroundImage: heroImage
                  ? `url(${heroImage})`
                  : 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                backgroundPosition: heroImage ? heroImagePosition : 'center',
                backgroundSize: heroImage ? `${heroImageZoom}%` : 'cover',
                backgroundRepeat: 'no-repeat',
              }}
            />
          </div>
        </div>

        {heroImageAttribution && <UnsplashAttribution attribution={heroImageAttribution} />}
      </section>

      {/* Mobile Modern Hero */}
      <section
        className="hero-section-mobile"
        style={{ display: 'none', paddingTop: '64px', background: '#0a0a0a' }}
      >
        {/* Hero Image */}
        <div
          style={{
            width: '200px',
            height: '250px',
            margin: '40px auto 0',
            borderRadius: '100px',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            backgroundImage: heroImage
              ? `url(${heroImage})`
              : 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
            backgroundPosition: heroImage ? heroImagePosition : 'center',
            backgroundSize: heroImage ? `${heroImageZoom}%` : 'cover',
            backgroundRepeat: 'no-repeat',
          }}
        />

        {/* Content */}
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '800',
              lineHeight: '1.2',
              marginBottom: '20px',
              color: '#fff',
              letterSpacing: '-0.02em',
              whiteSpace: 'pre-line',
            }}
          >
            {headline}
          </h1>

          <p
            style={{
              fontSize: '16px',
              lineHeight: '1.6',
              marginBottom: '32px',
              color: 'rgba(255, 255, 255, 0.7)',
            }}
          >
            {description}
          </p>

          <a
            href={resolveCtaLink(ctaLink)}
            style={{
              display: 'inline-block',
              padding: '14px 32px',
              background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
              color: 'var(--brand-500-contrast)',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '8px',
              textDecoration: 'none',
            }}
          >
            {ctaText}
          </a>

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              marginTop: '40px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {[
              { value: `${stats.totalStudents}+`, label: 'Students' },
              { value: `${stats.totalCourses}+`, label: 'Courses' },
              // Only show rating if there are actual ratings
              ...(stats.totalRatings && stats.totalRatings > 0
                ? [{ value: stats.rating.toFixed(1), label: 'Rating' }]
                : []),
            ].map((stat, i) => (
              <div key={i}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#fff' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
