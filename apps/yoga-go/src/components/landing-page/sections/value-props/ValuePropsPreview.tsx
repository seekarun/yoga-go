import type { SectionPreviewProps } from '../types';

export default function ValuePropsPreview({ data, template = 'classic' }: SectionPreviewProps) {
  const valueProps = data.valuePropositions;
  const isModern = template === 'modern';
  const heroImage = data.hero?.heroImage;

  // Don't render if no content
  if (
    !valueProps ||
    (!valueProps.content && (!valueProps.items || valueProps.items.length === 0))
  ) {
    return (
      <section
        style={{
          padding: isModern ? '80px 40px' : '40px 20px',
          background: isModern ? '#0a0a0a' : '#fff',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No value propositions configured. Click to add content.
        </p>
      </section>
    );
  }

  // Modern template - Image left, list right with icons
  if (isModern) {
    return (
      <section
        style={{
          padding: '100px 40px',
          background: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            right: '-20%',
            width: '50%',
            height: '100%',
            transform: 'translateY(-50%)',
            background:
              'radial-gradient(ellipse at center, color-mix(in srgb, var(--brand-600) 10%, transparent) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '1100px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '80px',
            alignItems: 'center',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left - Image with decorative elements */}
          <div style={{ position: 'relative' }}>
            {/* Background shape */}
            <div
              style={{
                position: 'absolute',
                top: '20px',
                left: '20px',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                borderRadius: '24px',
                opacity: 0.2,
              }}
            />
            {/* Main image */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: '400px',
                borderRadius: '24px',
                overflow: 'hidden',
                background: heroImage
                  ? `url(${heroImage}) center/cover`
                  : 'linear-gradient(135deg, #1f2937 0%, #111827 100%)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
              }}
            />
            {/* Floating badge */}
            <div
              style={{
                position: 'absolute',
                bottom: '-20px',
                right: '40px',
                background: 'linear-gradient(135deg, var(--brand-500) 0%, var(--brand-600) 100%)',
                borderRadius: '16px',
                padding: '20px 28px',
                boxShadow: '0 10px 40px color-mix(in srgb, var(--brand-500) 40%, transparent)',
              }}
            >
              <div
                style={{ fontSize: '28px', fontWeight: '800', color: 'var(--brand-500-contrast)' }}
              >
                100%
              </div>
              <div style={{ fontSize: '12px', color: 'var(--brand-500-contrast)', opacity: 0.8 }}>
                Satisfaction
              </div>
            </div>
          </div>

          {/* Right - Content */}
          <div>
            {/* Section label */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, var(--brand-500), var(--brand-600))',
                }}
              />
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--brand-400)',
                }}
              >
                Why Choose Us
              </span>
            </div>

            <h2
              style={{
                fontSize: '36px',
                fontWeight: '800',
                lineHeight: '1.2',
                marginBottom: '20px',
                color: '#fff',
                letterSpacing: '-0.02em',
              }}
            >
              Transform Your Practice,
              <br />
              <span style={{ color: 'var(--brand-400)' }}>Transform Your Life</span>
            </h2>

            <p
              style={{
                fontSize: '16px',
                lineHeight: '1.7',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '40px',
              }}
            >
              {valueProps.type === 'paragraph'
                ? valueProps.content
                : 'Discover the benefits of joining our community'}
            </p>

            {/* Value items as list with icons */}
            {valueProps.type !== 'paragraph' && valueProps.items && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {valueProps.items.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '20px',
                    }}
                  >
                    {/* Icon circle */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'color-mix(in srgb, var(--brand-500) 15%, transparent)',
                        border: '1px solid color-mix(in srgb, var(--brand-500) 30%, transparent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: '20px',
                          background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                        }}
                      >
                        {idx === 0 ? '✦' : idx === 1 ? '◈' : '✧'}
                      </span>
                    </div>
                    {/* Text */}
                    <div>
                      <p
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: '#fff',
                          marginBottom: '4px',
                        }}
                      >
                        {item}
                      </p>
                      <p
                        style={{
                          fontSize: '14px',
                          color: 'rgba(255,255,255,0.5)',
                          lineHeight: '1.5',
                        }}
                      >
                        Lorem ipsum dolor sit amet consectetur adipiscing.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // Classic template - Original grid layout
  return (
    <section
      style={{
        padding: '40px 20px',
        background: 'var(--brand-50)',
      }}
    >
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        {valueProps.type === 'paragraph' ? (
          <p
            style={{
              fontSize: '14px',
              lineHeight: '1.8',
              color: '#4a5568',
              textAlign: 'center',
              maxWidth: '700px',
              margin: '0 auto',
            }}
          >
            {valueProps.content}
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                valueProps.items?.length === 3
                  ? 'repeat(3, 1fr)'
                  : 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {valueProps.items?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px 16px',
                  background: '#fff',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid var(--brand-100)',
                }}
              >
                {/* Numbered circle */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, var(--brand-400) 0%, var(--brand-500) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: 'var(--brand-500-contrast)',
                    fontSize: '16px',
                    fontWeight: '600',
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    lineHeight: '1.5',
                    color: '#2d3748',
                    fontWeight: '500',
                  }}
                >
                  {item}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
