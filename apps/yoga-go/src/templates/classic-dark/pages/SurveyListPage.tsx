'use client';

import type { SurveyListPageProps } from '../../types';

export default function SurveyListPage({ surveys, expert, onSurveyClick }: SurveyListPageProps) {
  if (surveys.length === 0) {
    return (
      <div
        style={{
          paddingTop: '64px',
          minHeight: '100vh',
          background: '#f8f8f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '60px',
            background: '#fff',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>📋</span>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#111' }}>
            No surveys available
          </h2>
          <p style={{ color: '#666', marginBottom: '24px' }}>Check back later for new surveys.</p>
          <button
            onClick={() => onSurveyClick('')}
            style={{
              padding: '14px 32px',
              background: '#2563eb',
              color: '#fff',
              borderRadius: '8px',
              fontSize: '16px',
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
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #eee' }}>
        <div
          className="container"
          style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
        >
          <button
            onClick={() => onSurveyClick('')}
            style={{
              color: '#2563eb',
              fontSize: '14px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <svg
              style={{ width: '20px', height: '20px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111', marginBottom: '8px' }}>
            Surveys
          </h1>
          <p style={{ fontSize: '18px', color: '#666' }}>
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
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: '#111',
                    marginBottom: '8px',
                  }}
                >
                  {survey.title}
                </h2>
                {survey.description && (
                  <p
                    style={{
                      fontSize: '15px',
                      color: '#666',
                      marginBottom: '12px',
                      lineHeight: '1.5',
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
                  <span style={{ fontSize: '13px', color: '#999' }}>
                    {survey.questions?.length || 0} questions
                  </span>
                  <span style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500' }}>
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
