import type { AboutSectionProps } from '../../types';

export default function AboutSection({
  layoutType,
  videoCloudflareId,
  videoStatus,
  imageUrl,
  text,
  expertName,
}: AboutSectionProps) {
  if (layoutType !== 'video' && layoutType !== 'image-text') {
    return null;
  }

  const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

  return (
    <section
      id="about"
      style={{
        padding: '100px 40px',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111827 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background pattern */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--brand-500) 15%, transparent) 1px, transparent 0)`,
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          maxWidth: '1100px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <h2
            style={{
              fontSize: '42px',
              fontWeight: '800',
              color: '#fff',
              letterSpacing: '-0.02em',
            }}
          >
            My <span style={{ color: 'var(--brand-400)' }}>Journey</span>
          </h2>
        </div>

        {layoutType === 'video' && videoCloudflareId && videoStatus === 'ready' ? (
          <div
            style={{
              maxWidth: '900px',
              margin: '0 auto',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 80px color-mix(in srgb, var(--brand-500) 20%, transparent)',
              border: '1px solid color-mix(in srgb, var(--brand-500) 20%, transparent)',
            }}
          >
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://customer-${cfSubdomain}.cloudflarestream.com/${videoCloudflareId}/iframe?preload=auto&poster=https%3A%2F%2Fcustomer-${cfSubdomain}.cloudflarestream.com%2F${videoCloudflareId}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D1s%26height%3D600`}
                style={{
                  border: 'none',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  height: '100%',
                  width: '100%',
                }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                allowFullScreen={true}
                title="About Video"
              />
            </div>
          </div>
        ) : layoutType === 'image-text' ? (
          <div
            className="about-modern-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '400px 1fr',
              gap: '60px',
              alignItems: 'center',
            }}
          >
            {/* Left - Image card */}
            <div style={{ position: 'relative' }}>
              {/* Decorative frame */}
              <div
                style={{
                  position: 'absolute',
                  top: '-20px',
                  left: '-20px',
                  width: '100px',
                  height: '100px',
                  borderTop: '3px solid var(--brand-500)',
                  borderLeft: '3px solid var(--brand-500)',
                  borderRadius: '20px 0 0 0',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  bottom: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  borderBottom: '3px solid var(--brand-600)',
                  borderRight: '3px solid var(--brand-600)',
                  borderRadius: '0 0 20px 0',
                }}
              />

              {imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt="About"
                  style={{
                    width: '100%',
                    height: '500px',
                    objectFit: 'cover',
                    borderRadius: '20px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                  }}
                />
              )}

              {/* Experience badge */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '30px',
                  left: '-30px',
                  background: '#fff',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ fontSize: '32px', fontWeight: '800', color: 'var(--brand-500)' }}>
                  10+
                </div>
                <div style={{ fontSize: '12px', color: '#666', fontWeight: '500' }}>
                  Years Experience
                </div>
              </div>
            </div>

            {/* Right - Text content */}
            <div>
              {/* Large quote mark */}
              <div
                style={{
                  fontSize: '120px',
                  lineHeight: '0.8',
                  color: 'color-mix(in srgb, var(--brand-500) 20%, transparent)',
                  fontFamily: 'Georgia, serif',
                  marginBottom: '-30px',
                }}
              >
                &ldquo;
              </div>

              <p
                style={{
                  fontSize: '20px',
                  lineHeight: '1.8',
                  color: 'rgba(255,255,255,0.85)',
                  marginBottom: '30px',
                  fontStyle: 'italic',
                }}
              >
                {text}
              </p>

              {/* Signature area */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '20px',
                  paddingTop: '30px',
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid var(--brand-500)',
                  }}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(135deg, var(--brand-500), var(--brand-600))',
                      }}
                    />
                  )}
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                    {expertName}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--brand-400)' }}>Yoga Instructor</div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
