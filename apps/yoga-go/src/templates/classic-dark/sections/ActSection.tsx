import Link from 'next/link';
import { SECTION_MAX_WIDTH } from '../../shared';
import type { ActSectionProps } from '../../types';

interface ClassicActSectionProps extends ActSectionProps {
  resolveCtaLink: (link: string | undefined) => string;
}

export default function ActSection({
  imageUrl,
  title,
  text,
  ctaText,
  ctaLink,
  resolveCtaLink,
}: ClassicActSectionProps) {
  if (!imageUrl && !title && !text) {
    return null;
  }

  return (
    <div style={{ background: '#0f0f0f' }}>
      <section
        className="act-section"
        style={{
          padding: '80px 20px',
          background: '#1a1a1a',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <div className="container" style={{ maxWidth: SECTION_MAX_WIDTH, margin: '0 auto' }}>
          <div
            className="act-section-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            <div
              className="act-section-image"
              style={{
                width: '100%',
                height: '400px',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt={title || 'Act section'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
            </div>

            <div>
              <h2
                className="act-section-title"
                style={{
                  fontSize: '48px',
                  fontWeight: '700',
                  marginBottom: '24px',
                  color: '#fff',
                  lineHeight: '1.2',
                }}
              >
                {title || "Let's uncover the power of your brand."}
              </h2>
              <p
                className="act-section-text"
                style={{
                  fontSize: '18px',
                  lineHeight: '1.8',
                  color: '#d1d5db',
                  marginBottom: '32px',
                }}
              >
                {text ||
                  "Take the guesswork out of your branding and marketing today with this rapid questionnaire. At the end you'll receive a personalised report with data insights and key suggestions to help you move forward with your business in a new light."}
              </p>
              <Link
                href={resolveCtaLink(ctaLink)}
                className="act-cta-button"
                style={{
                  padding: '16px 48px',
                  background: 'var(--brand-500, #fcd34d)',
                  color: 'var(--brand-500-contrast, #1f2937)',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: '600',
                  textDecoration: 'none',
                  display: 'inline-block',
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
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
