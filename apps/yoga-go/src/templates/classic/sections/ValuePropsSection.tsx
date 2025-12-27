import { SECTION_MAX_WIDTH } from '../../shared';
import type { ValuePropsSectionProps } from '../../types';

export default function ValuePropsSection({ type, content, items }: ValuePropsSectionProps) {
  if (!content && (!items || items.length === 0)) {
    return null;
  }

  return (
    <div style={{ background: '#fff' }}>
      <section
        style={{
          padding: '12px 20px 30px 20px',
          background: 'var(--brand-secondary, #f7fafc)',
          maxWidth: SECTION_MAX_WIDTH,
          margin: '0 auto',
        }}
      >
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto' }}>
          {type === 'paragraph' ? (
            <p
              style={{
                fontSize: '18px',
                lineHeight: '1.8',
                color: '#4a5568',
                textAlign: 'center',
              }}
            >
              {content}
            </p>
          ) : (
            <div
              className="value-props-grid"
              style={{
                display: 'grid',
                gridTemplateColumns:
                  items?.length === 3 ? 'repeat(3, 1fr)' : 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '32px',
                maxWidth: '1000px',
                margin: '0 auto',
              }}
            >
              {items?.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    position: 'relative',
                    paddingTop: '50px',
                    marginTop: '50px',
                  }}
                >
                  {/* Icon/Image - positioned on top border */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '0px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      background: item.image
                        ? '#fff'
                        : 'linear-gradient(135deg, var(--brand-400, #9ca3af) 0%, var(--brand-500, #6b7280) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--brand-500-contrast, #fff)',
                      fontSize: '28px',
                      fontWeight: '600',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      border: '4px solid #fff',
                      zIndex: 1,
                    }}
                  >
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.image}
                        alt={item.title || `Value ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  {/* Card content */}
                  <div
                    style={{
                      padding: '60px 24px 32px',
                      background: '#fff',
                      borderRadius: '12px',
                      textAlign: 'center',
                      border: '1px solid var(--brand-100, #e2e8f0)',
                      height: '210px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Title */}
                    {item.title && (
                      <h3
                        style={{
                          fontSize: '18px',
                          fontWeight: '600',
                          color: 'var(--brand-500)',
                          marginBottom: '12px',
                          flexShrink: 0,
                        }}
                      >
                        {item.title}
                      </h3>
                    )}
                    {/* Description */}
                    {item.description && (
                      <p
                        style={{
                          fontSize: '15px',
                          lineHeight: '1.6',
                          color: '#4a5568',
                          margin: 0,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
