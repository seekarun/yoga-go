import type { SectionPreviewProps } from '../types';

export default function AboutPreview({ data }: SectionPreviewProps) {
  const about = data.about;

  // Don't render if no layout type or content
  if (!about || !about.layoutType) {
    return (
      <section
        style={{
          padding: '40px 20px',
          background: '#f8f8f8',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No about section configured. Click to add content.
        </p>
      </section>
    );
  }

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
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
