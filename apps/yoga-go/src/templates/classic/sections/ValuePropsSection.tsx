import type { ValuePropsSectionProps } from '../../types';

export default function ValuePropsSection({ type, content, items }: ValuePropsSectionProps) {
  if (!content && (!items || items.length === 0)) {
    return null;
  }

  return (
    <section style={{ padding: '60px 20px', background: 'var(--brand-50, #fff)' }}>
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
                  padding: '32px 24px',
                  background: '#fff',
                  borderRadius: '12px',
                  textAlign: 'center',
                  border: '1px solid var(--brand-100, #e2e8f0)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, var(--brand-400, #9ca3af) 0%, var(--brand-500, #6b7280) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    color: 'var(--brand-500-contrast, #fff)',
                    fontSize: '24px',
                    fontWeight: '600',
                  }}
                >
                  {idx + 1}
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
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
