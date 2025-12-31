import { SECTION_MAX_WIDTH } from '../../shared';
import type { AboutSectionProps } from '../../types';

export default function AboutSection({
  layoutType,
  videoCloudflareId,
  videoStatus,
  imageUrl,
  imagePosition = '50% 50%',
  imageZoom = 100,
  text,
}: AboutSectionProps) {
  if (layoutType !== 'video' && layoutType !== 'image-text') {
    return null;
  }

  const cfSubdomain = process.env.NEXT_PUBLIC_CF_SUBDOMAIN || 'placeholder';

  return (
    <div style={{ background: '#0f0f0f' }}>
      <section
        id="about"
        style={{
          padding: '60px 20px',
          background: '#0f0f0f',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <div className="container" style={{ maxWidth: SECTION_MAX_WIDTH, margin: '0 auto' }}>
          {layoutType === 'video' && videoCloudflareId && videoStatus === 'ready' ? (
            <div
              style={{
                maxWidth: '900px',
                margin: '0 auto',
                borderRadius: '12px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
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
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '48px',
                alignItems: 'center',
              }}
            >
              {imageUrl && (
                <div
                  style={{
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                    aspectRatio: '4/3',
                    backgroundImage: `url(${imageUrl})`,
                    backgroundPosition: imagePosition,
                    backgroundSize: `${imageZoom}%`,
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )}
              <div style={{ fontSize: '18px', lineHeight: '1.8', color: '#b0b0b0' }}>{text}</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
