import type { SectionPreviewProps } from '../types';

export default function AboutPreview({ data, template = 'classic' }: SectionPreviewProps) {
  const about = data.about;
  const isModern = template === 'modern';

  // Don't render if no layout type or content
  if (!about || !about.layoutType) {
    return (
      <section
        style={{
          padding: isModern ? '80px 40px' : '40px 20px',
          background: isModern ? '#111' : '#f8f8f8',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No about section configured. Click to add content.
        </p>
      </section>
    );
  }

  // Modern template - Full-width with overlapping elements
  if (isModern) {
    return (
      <section
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
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.15) 1px, transparent 0)`,
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
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, transparent, #6366f1)',
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
                About Me
              </span>
              <span
                style={{
                  width: '40px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #6366f1, transparent)',
                }}
              />
            </div>
            <h2
              style={{
                fontSize: '42px',
                fontWeight: '800',
                color: '#fff',
                letterSpacing: '-0.02em',
              }}
            >
              My <span style={{ color: '#a855f7' }}>Journey</span>
            </h2>
          </div>

          {about.layoutType === 'video' &&
          about.videoCloudflareId &&
          about.videoStatus === 'ready' ? (
            // Video Layout - Cinematic style
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                borderRadius: '24px',
                overflow: 'hidden',
                boxShadow: '0 20px 80px rgba(99, 102, 241, 0.2)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
                <iframe
                  src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${about.videoCloudflareId}/iframe?preload=auto`}
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
          ) : about.layoutType === 'video' ? (
            // Video placeholder
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                padding: '100px 20px',
                background: 'rgba(99, 102, 241, 0.1)',
                borderRadius: '24px',
                textAlign: 'center',
                border: '1px solid rgba(99, 102, 241, 0.2)',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(99, 102, 241, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                }}
              >
                <span style={{ fontSize: '32px' }}>▶</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                {about.videoStatus === 'processing'
                  ? 'Video is processing...'
                  : about.videoStatus === 'uploading'
                    ? 'Video is uploading...'
                    : 'No video uploaded yet'}
              </p>
            </div>
          ) : about.layoutType === 'image-text' ? (
            // Image + Text Layout - Card style with quote
            <div
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
                    borderTop: '3px solid #6366f1',
                    borderLeft: '3px solid #6366f1',
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
                    borderBottom: '3px solid #a855f7',
                    borderRight: '3px solid #a855f7',
                    borderRadius: '0 0 20px 0',
                  }}
                />

                {about.imageUrl ? (
                  <img
                    src={about.imageUrl}
                    alt="About"
                    style={{
                      width: '100%',
                      height: '500px',
                      objectFit: 'cover',
                      borderRadius: '20px',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '500px',
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
                  <div style={{ fontSize: '32px', fontWeight: '800', color: '#6366f1' }}>10+</div>
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
                    color: 'rgba(99, 102, 241, 0.2)',
                    fontFamily: 'Georgia, serif',
                    marginBottom: '-30px',
                  }}
                >
                  "
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
                  {about.text || 'Add text to describe yourself or your approach...'}
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
                      border: '2px solid #6366f1',
                    }}
                  >
                    {about.imageUrl ? (
                      <img
                        src={about.imageUrl}
                        alt="Avatar"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                      Your Name
                    </div>
                    <div style={{ fontSize: '14px', color: '#a855f7' }}>Yoga Instructor</div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    );
  }

  // Classic template - Original layout
  return (
    <section
      style={{
        padding: '40px 20px',
        background: '#f8f8f8',
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {about.layoutType === 'video' &&
        about.videoCloudflareId &&
        about.videoStatus === 'ready' ? (
          // Video Layout - Centered
          <div
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              borderRadius: '8px',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0 }}>
              <iframe
                src={`https://customer-${process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder'}.cloudflarestream.com/${about.videoCloudflareId}/iframe?preload=auto`}
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
        ) : about.layoutType === 'video' ? (
          // Video layout selected but no video ready
          <div
            style={{
              padding: '60px 20px',
              background: '#e5e7eb',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              {about.videoStatus === 'processing'
                ? 'Video is processing...'
                : about.videoStatus === 'uploading'
                  ? 'Video is uploading...'
                  : 'No video uploaded yet'}
            </p>
          </div>
        ) : about.layoutType === 'image-text' ? (
          // Image + Text Layout - Side by Side
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              {about.imageUrl ? (
                <img
                  src={about.imageUrl}
                  alt="About"
                  style={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '200px',
                    background: '#e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: '#9ca3af', fontSize: '12px' }}>No image uploaded</span>
                </div>
              )}
            </div>
            <div
              style={{
                fontSize: '13px',
                lineHeight: '1.7',
                color: '#4a5568',
              }}
            >
              {about.text || (
                <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Add text to describe yourself or your approach...
                </span>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
