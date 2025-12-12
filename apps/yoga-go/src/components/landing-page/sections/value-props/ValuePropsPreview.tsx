import type { SectionPreviewProps } from '../types';

export default function ValuePropsPreview({ data }: SectionPreviewProps) {
  const valueProps = data.valuePropositions;

  // Don't render if no content
  if (
    !valueProps ||
    (!valueProps.content && (!valueProps.items || valueProps.items.length === 0))
  ) {
    return (
      <section
        style={{
          padding: '40px 20px',
          background: '#fff',
          textAlign: 'center',
        }}
      >
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          No value propositions configured. Click to add content.
        </p>
      </section>
    );
  }

  return (
    <section
      style={{
        padding: '40px 20px',
        background: '#fff',
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
                  : 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
            }}
          >
            {valueProps.items?.map((item, idx) => (
              <div
                key={idx}
                style={{
                  padding: '20px 16px',
                  background: '#f7fafc',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e2e8f0',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background:
                      'linear-gradient(135deg, var(--color-primary-light) 0%, var(--color-primary) 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    color: '#fff',
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
