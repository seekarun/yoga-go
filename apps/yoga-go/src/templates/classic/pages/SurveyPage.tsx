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
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <span style={{ fontSize: '48px', marginBottom: '16px', display: 'block' }}>✓</span>
          <h2 style={{ fontSize: '28px', fontWeight: '600', color: '#111', marginBottom: '16px' }}>
            Thank you!
          </h2>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '8px' }}>
            Your response has been submitted successfully.
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>Redirecting you back...</p>
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
              color: '#111',
            }}
          >
            {question.questionText}
            {question.required && <span style={{ color: '#dc2626' }}> *</span>}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '8px',
                  border:
                    answers[question.id] === option.id ? '2px solid #2563eb' : '2px solid #e5e7eb',
                  background: answers[question.id] === option.id ? '#eff6ff' : '#fff',
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
                <span style={{ color: '#374151' }}>{option.label}</span>
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
              color: '#111',
            }}
          >
            {question.questionText}
            {question.required && <span style={{ color: '#dc2626' }}> *</span>}
          </label>
          <textarea
            value={answers[question.id] || ''}
            onChange={e => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            placeholder="Type your answer here..."
            style={{
              width: '100%',
              padding: '16px',
              borderRadius: '8px',
              border: '2px solid #e5e7eb',
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
    <div style={{ paddingTop: '64px', minHeight: '100vh', background: '#f8f8f8' }}>
      <div
        className="container"
        style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: '16px',
            padding: '48px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h1
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#111',
              marginBottom: '16px',
            }}
          >
            {survey.title}
          </h1>
          {survey.description && (
            <p
              style={{
                fontSize: '16px',
                color: '#666',
                marginBottom: '40px',
                lineHeight: '1.6',
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
                  borderBottom: '2px solid #f3f4f6',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '24px',
                    color: '#111',
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
                        color: '#111',
                      }}
                    >
                      Name
                      {survey.contactInfo.nameRequired && (
                        <span style={{ color: '#dc2626' }}> *</span>
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
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
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
                        color: '#111',
                      }}
                    >
                      Email
                      {survey.contactInfo.emailRequired && (
                        <span style={{ color: '#dc2626' }}> *</span>
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
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
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
                        color: '#111',
                      }}
                    >
                      Phone
                      {survey.contactInfo.phoneRequired && (
                        <span style={{ color: '#dc2626' }}> *</span>
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
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
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
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
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
                  background: '#e5e7eb',
                  color: '#374151',
                  borderRadius: '8px',
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
                  background: submitting ? '#9ca3af' : '#2563eb',
                  color: '#fff',
                  borderRadius: '8px',
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
