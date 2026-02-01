'use client';

import type { SurveyListPageProps } from '../../types';

export default function SurveyListPage({ surveys, expert, onSurveyClick }: SurveyListPageProps) {
  if (surveys.length === 0) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '60px 40px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <span style={{ fontSize: '64px', marginBottom: '24px', display: 'block' }}>📋</span>
          <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>
            No surveys available
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '16px', marginBottom: '24px' }}>
            Check back later for new surveys.
          </p>
          <button
            onClick={() => onSurveyClick('')}
            style={{
              padding: '14px 32px',
              background: 'var(--brand-500)',
              color: 'var(--brand-500-contrast)',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: '600',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="container"
          style={{ maxWidth: '800px', margin: '0 auto', padding: '60px 20px' }}
        >
          <button
            onClick={() => onSurveyClick('')}
            style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '20px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span style={{ fontSize: '18px' }}>←</span>
            Back to {expert.name}
          </button>
          <h1
            style={{
              fontSize: '42px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '12px',
              letterSpacing: '-0.02em',
            }}
          >
            Surveys
          </h1>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.6' }}>
            Help us improve by completing one of our surveys below.
          </p>
        </div>
      </div>

      {/* Surveys List */}
      <section style={{ padding: '40px 20px' }}>
        <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {surveys.map(survey => (
              <button
                key={survey.id}
                onClick={() => onSurveyClick(survey.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '16px',
                  padding: '28px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#fff',
                    marginBottom: '8px',
                  }}
                >
                  {survey.title}
                </h2>
                {survey.description && (
                  <p
                    style={{
                      fontSize: '15px',
                      color: 'rgba(255,255,255,0.6)',
                      marginBottom: '12px',
                      lineHeight: '1.6',
                    }}
                  >
                    {survey.description}
                  </p>
                )}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
                    {survey.questions?.length || 0} questions
                  </span>
                  <span
                    style={{
                      color: 'var(--brand-400)',
                      fontSize: '14px',
                      fontWeight: '600',
                    }}
                  >
                    Start survey →
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
