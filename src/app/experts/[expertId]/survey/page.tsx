'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Survey, SurveyQuestion, SurveyAnswer } from '@/types';

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSurvey = async () => {
      try {
        console.log('[DBG][survey-page] Fetching survey for expert:', expertId);
        const response = await fetch(`/data/experts/${expertId}/survey`);
        const data = await response.json();

        if (data.success) {
          setSurvey(data.data);
          console.log('[DBG][survey-page] Survey loaded:', data.data);
        } else {
          setError(data.error || 'Failed to load survey');
          console.error('[DBG][survey-page] Error loading survey:', data.error);
        }
      } catch (err) {
        console.error('[DBG][survey-page] Error fetching survey:', err);
        setError('Failed to load survey');
      } finally {
        setLoading(false);
      }
    };

    if (expertId) {
      fetchSurvey();
    }
  }, [expertId]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!survey) return;

    // Validate required contact info
    if (
      survey.contactInfo?.collectName &&
      survey.contactInfo.nameRequired &&
      !contactInfo.name.trim()
    ) {
      setError('Name is required');
      return;
    }
    if (
      survey.contactInfo?.collectEmail &&
      survey.contactInfo.emailRequired &&
      !contactInfo.email.trim()
    ) {
      setError('Email is required');
      return;
    }
    if (
      survey.contactInfo?.collectPhone &&
      survey.contactInfo.phoneRequired &&
      !contactInfo.phone.trim()
    ) {
      setError('Phone is required');
      return;
    }

    // Validate required questions
    const unansweredRequired = survey.questions.filter(q => q.required && !answers[q.id]);

    if (unansweredRequired.length > 0) {
      setError('Please answer all required questions');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const surveyAnswers: SurveyAnswer[] = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      // Prepare contact info to submit
      const contactInfoToSubmit: any = {};
      if (survey.contactInfo?.collectName && contactInfo.name) {
        contactInfoToSubmit.name = contactInfo.name;
      }
      if (survey.contactInfo?.collectEmail && contactInfo.email) {
        contactInfoToSubmit.email = contactInfo.email;
      }
      if (survey.contactInfo?.collectPhone && contactInfo.phone) {
        contactInfoToSubmit.phone = contactInfo.phone;
      }

      const response = await fetch(`/data/experts/${expertId}/survey/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveyId: survey.id,
          contactInfo:
            Object.keys(contactInfoToSubmit).length > 0 ? contactInfoToSubmit : undefined,
          answers: surveyAnswers,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DBG][survey-page] Survey submitted successfully');
        setSubmitted(true);
        // Redirect to courses page after 2 seconds
        setTimeout(() => {
          router.push(`/experts/${expertId}`);
        }, 2000);
      } else {
        setError(data.error || 'Failed to submit survey');
      }
    } catch (err) {
      console.error('[DBG][survey-page] Error submitting survey:', err);
      setError('Failed to submit survey');
    } finally {
      setSubmitting(false);
    }
  };

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
              color: '#1a202c',
            }}
          >
            {question.questionText}
            {question.required && <span style={{ color: '#e53e3e' }}> *</span>}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {question.options?.map(option => (
              <label
                key={option.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  background: answers[question.id] === option.id ? '#edf2f7' : '#fff',
                  border: `2px solid ${answers[question.id] === option.id ? '#764ba2' : '#e2e8f0'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  if (answers[question.id] !== option.id) {
                    e.currentTarget.style.background = '#f7fafc';
                  }
                }}
                onMouseLeave={e => {
                  if (answers[question.id] !== option.id) {
                    e.currentTarget.style.background = '#fff';
                  }
                }}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => handleAnswerChange(question.id, option.id)}
                  style={{
                    marginRight: '12px',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '16px', color: '#2d3748' }}>{option.label}</span>
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
              color: '#1a202c',
            }}
          >
            {question.questionText}
            {question.required && <span style={{ color: '#e53e3e' }}> *</span>}
          </label>
          <textarea
            value={answers[question.id] || ''}
            onChange={e => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '16px',
              border: '2px solid #e2e8f0',
              borderRadius: '8px',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
            placeholder="Type your answer here..."
          />
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ fontSize: '16px', color: '#666' }}>Loading survey...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
            background: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h2
            style={{ fontSize: '32px', fontWeight: '600', marginBottom: '16px', color: '#1a202c' }}
          >
            Thank you!
          </h2>
          <p style={{ fontSize: '18px', color: '#4a5568', marginBottom: '24px' }}>
            Your response has been submitted successfully.
          </p>
          <div style={{ fontSize: '16px', color: '#718096' }}>Redirecting you back...</div>
        </div>
      </div>
    );
  }

  if (error || !survey) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f5f5f5',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '16px', color: '#e53e3e' }}>
            {error || 'Survey not found'}
          </h2>
          <button
            onClick={() => router.push(`/experts/${expertId}`)}
            style={{
              padding: '12px 24px',
              background: '#764ba2',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
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
    <div style={{ minHeight: '100vh', background: '#f5f5f5', padding: '40px 20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: '12px',
            padding: '48px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          }}
        >
          <h1
            style={{
              fontSize: '36px',
              fontWeight: '700',
              marginBottom: '16px',
              color: '#1a202c',
            }}
          >
            {survey.title}
          </h1>
          {survey.description && (
            <p
              style={{
                fontSize: '18px',
                color: '#4a5568',
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
                  borderBottom: '2px solid #e2e8f0',
                }}
              >
                <h2
                  style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    marginBottom: '24px',
                    color: '#1a202c',
                  }}
                >
                  Your Information
                </h2>

                {/* Name Field */}
                {survey.contactInfo?.collectName && (
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#1a202c',
                      }}
                    >
                      Name
                      {survey.contactInfo.nameRequired && (
                        <span style={{ color: '#e53e3e' }}> *</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={contactInfo.name}
                      onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      placeholder="Enter your name"
                      required={survey.contactInfo.nameRequired}
                    />
                  </div>
                )}

                {/* Email Field */}
                {survey.contactInfo?.collectEmail && (
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#1a202c',
                      }}
                    >
                      Email
                      {survey.contactInfo.emailRequired && (
                        <span style={{ color: '#e53e3e' }}> *</span>
                      )}
                    </label>
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      placeholder="Enter your email"
                      required={survey.contactInfo.emailRequired}
                    />
                  </div>
                )}

                {/* Phone Field */}
                {survey.contactInfo?.collectPhone && (
                  <div style={{ marginBottom: '24px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '16px',
                        fontWeight: '600',
                        marginBottom: '8px',
                        color: '#1a202c',
                      }}
                    >
                      Phone
                      {survey.contactInfo.phoneRequired && (
                        <span style={{ color: '#e53e3e' }}> *</span>
                      )}
                    </label>
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '16px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                      placeholder="Enter your phone number"
                      required={survey.contactInfo.phoneRequired}
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
                  padding: '12px 16px',
                  background: '#fff5f5',
                  border: '1px solid #fc8181',
                  borderRadius: '8px',
                  color: '#c53030',
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
                onClick={() => router.push(`/experts/${expertId}`)}
                style={{
                  padding: '14px 32px',
                  background: '#e2e8f0',
                  color: '#2d3748',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '14px 32px',
                  background: submitting ? '#a0aec0' : '#764ba2',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
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
