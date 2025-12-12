import type { SectionPreviewProps } from '../types';

export default function ActPreview({ data }: SectionPreviewProps) {
  const act = data.act;
  const heroCtaText = data.hero?.ctaText || 'Get Your Results';

  // Don't render if no content
  if (!act || (!act.imageUrl && !act.title && !act.text)) {
    return (
      <section
        style={{
          padding: '40px 20px',
          background: '#374151',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No call-to-action section configured. Click to add content.
        </p>
      </section>
    );
  }

  return (
    <section style={{ padding: '40px 20px', background: '#374151' }}>
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
            <span
              style={{
                padding: '10px 24px',
                background: '#fcd34d',
                color: '#1f2937',
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
