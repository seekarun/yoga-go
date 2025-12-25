'use client';

import { useState } from 'react';
import type { SurveyPageProps } from '../../types';
import type { SurveyQuestion } from '@/types';

export default function SurveyPage({
  survey,
  expert,
  onSubmit,
  onCancel,
  submitting,
  submitted,
  error,
}: SurveyPageProps) {
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(contactInfo, answers);
  };

  if (submitted) {
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
          <span style={{ fontSize: '64px', marginBottom: '24px', display: 'block' }}>✓</span>
          <h2 style={{ fontSize: '32px', fontWeight: '700', color: '#fff', marginBottom: '12px' }}>
            Thank you!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '18px', marginBottom: '8px' }}>
            Your response has been submitted successfully.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>
            Redirecting you back...
          </p>
        </div>
      </div>
    );
  }

  const renderQuestion = (question: SurveyQuestion) => {
    if (question.type === 'multiple-choice') {
      return (
        <div key={question.id} style={{ marginBottom: '32px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#fff',
            }}
          >
            {question.questionText}
            {question.required && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border:
                    answers[question.id] === option.id
                      ? '2px solid var(--brand-500)'
                      : '2px solid rgba(255,255,255,0.1)',
                  background:
                    answers[question.id] === option.id
                      ? 'rgba(var(--brand-500-rgb), 0.1)'
                      : 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => handleAnswerChange(question.id, option.id)}
                  style={{ width: '20px', height: '20px', marginRight: '12px' }}
                />
                <span style={{ color: 'rgba(255,255,255,0.9)' }}>{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (question.type === 'text') {
      return (
        <div key={question.id} style={{ marginBottom: '32px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '18px',
              fontWeight: '600',
              marginBottom: '16px',
              color: '#fff',
            }}
          >
            {question.questionText}
            {question.required && <span style={{ color: '#ef4444' }}> *</span>}
          </label>
          <textarea
            value={answers[question.id] || ''}
            onChange={e => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            placeholder="Type your answer here..."
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '12px',
              border: '2px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)',
              color: '#fff',
              fontSize: '16px',
              resize: 'vertical',
              outline: 'none',
            }}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        paddingTop: '64px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0a0a0a 0%, #111 100%)',
      }}
    >
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
      >
        <div
          style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '24px',
            padding: '48px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '800',
              color: '#fff',
              marginBottom: '16px',
              letterSpacing: '-0.02em',
            }}
          >
            {survey.title}
          </h1>
          {survey.description && (
            <p
              style={{
                fontSize: '18px',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '40px',
                lineHeight: '1.7',
              }}
            >
              {survey.description}
            </p>
          )}

          <form onSubmit={handleSubmit}>
            {/* Contact Information Fields */}
            {(survey.contactInfo?.collectName ||
              survey.contactInfo?.collectEmail ||
              survey.contactInfo?.collectPhone) && (
              <div
                style={{
                  marginBottom: '40px',
                  paddingBottom: '40px',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    marginBottom: '24px',
                    color: '#fff',
                  }}
                >
                  Your Information
                </h2>

                {survey.contactInfo?.collectName && (
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#fff',
                      }}
                    >
                      Name
                      {survey.contactInfo.nameRequired && (
                        <span style={{ color: '#ef4444' }}> *</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={contactInfo.name}
                      onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                      placeholder="Enter your name"
                      required={survey.contactInfo.nameRequired}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '2px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: '#fff',
                        fontSize: '15px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {survey.contactInfo?.collectEmail && (
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#fff',
                      }}
                    >
                      Email
                      {survey.contactInfo.emailRequired && (
                        <span style={{ color: '#ef4444' }}> *</span>
                      )}
                    </label>
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                      placeholder="Enter your email"
                      required={survey.contactInfo.emailRequired}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '2px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: '#fff',
                        fontSize: '15px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}

                {survey.contactInfo?.collectPhone && (
                  <div style={{ marginBottom: '20px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '15px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#fff',
                      }}
                    >
                      Phone
                      {survey.contactInfo.phoneRequired && (
                        <span style={{ color: '#ef4444' }}> *</span>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      placeholder="Enter your phone number"
                      required={survey.contactInfo.phoneRequired}
                      style={{
                        width: '100%',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: '2px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.03)',
                        color: '#fff',
                        fontSize: '15px',
                        outline: 'none',
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {survey.questions
              .sort((a, b) => a.order - b.order)
              .map(question => renderQuestion(question))}

            {error && (
              <div
                style={{
                  padding: '16px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '12px',
                  color: '#ef4444',
                  marginBottom: '24px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '14px 28px',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.8)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '14px 28px',
                  background: submitting ? 'rgba(255,255,255,0.2)' : 'var(--brand-500)',
                  color: submitting ? 'rgba(255,255,255,0.5)' : 'var(--brand-500-contrast)',
                  borderRadius: '12px',
                  fontSize: '15px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
