'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Survey, SurveyQuestion, SurveyAnswer } from '@/types';

export default function SurveyPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;
  const surveyId = params.surveyId as string;

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
        console.log('[DBG][survey-page] Fetching survey:', surveyId);
        const response = await fetch(`/data/experts/${expertId}/survey/${surveyId}`);
        const data = await response.json();

        if (data.success) {
          setSurvey(data.data);
          console.log('[DBG][survey-page] Survey loaded:', data.data.title);
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

    if (expertId && surveyId) {
      fetchSurvey();
    }
  }, [expertId, surveyId]);

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
      const contactInfoToSubmit: { name?: string; email?: string; phone?: string } = {};
      if (survey.contactInfo?.collectName && contactInfo.name) {
        contactInfoToSubmit.name = contactInfo.name;
      }
      if (survey.contactInfo?.collectEmail && contactInfo.email) {
        contactInfoToSubmit.email = contactInfo.email;
      }
      if (survey.contactInfo?.collectPhone && contactInfo.phone) {
        contactInfoToSubmit.phone = contactInfo.phone;
      }

      const response = await fetch(`/data/experts/${expertId}/survey/${surveyId}/response`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactInfo:
            Object.keys(contactInfoToSubmit).length > 0 ? contactInfoToSubmit : undefined,
          answers: surveyAnswers,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DBG][survey-page] Survey submitted successfully');
        setSubmitted(true);
        // Redirect to expert page after 2 seconds
        setTimeout(() => {
          router.push('/');
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
        <div key={question.id} className="mb-8">
          <label className="block text-lg font-semibold mb-4 text-gray-900">
            {question.questionText}
            {question.required && <span className="text-red-500"> *</span>}
          </label>
          <div className="flex flex-col gap-3">
            {question.options?.map(option => (
              <label
                key={option.id}
                className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  answers[question.id] === option.id
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={answers[question.id] === option.id}
                  onChange={() => handleAnswerChange(question.id, option.id)}
                  className="w-5 h-5 mr-3 text-blue-600"
                />
                <span className="text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    if (question.type === 'text') {
      return (
        <div key={question.id} className="mb-8">
          <label className="block text-lg font-semibold mb-4 text-gray-900">
            {question.questionText}
            {question.required && <span className="text-red-500"> *</span>}
          </label>
          <textarea
            value={answers[question.id] || ''}
            onChange={e => handleAnswerChange(question.id, e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 resize-y"
            placeholder="Type your answer here..."
          />
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Loading survey...</div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-10 bg-white rounded-xl shadow-lg">
          <h2 className="text-3xl font-semibold mb-4 text-gray-900">Thank you!</h2>
          <p className="text-lg text-gray-600 mb-6">
            Your response has been submitted successfully.
          </p>
          <div className="text-gray-500">Redirecting you back...</div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl mb-4 text-red-500">{error || 'Survey not found'}</h2>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-5">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white rounded-xl p-12 shadow-lg">
          <h1 className="text-4xl font-bold mb-4 text-gray-900">{survey.title}</h1>
          {survey.description && (
            <p className="text-lg text-gray-600 mb-10 leading-relaxed">{survey.description}</p>
          )}

          <form onSubmit={handleSubmit}>
            {/* Contact Information Fields */}
            {(survey.contactInfo?.collectName ||
              survey.contactInfo?.collectEmail ||
              survey.contactInfo?.collectPhone) && (
              <div className="mb-10 pb-10 border-b-2 border-gray-200">
                <h2 className="text-xl font-semibold mb-6 text-gray-900">Your Information</h2>

                {/* Name Field */}
                {survey.contactInfo?.collectName && (
                  <div className="mb-6">
                    <label className="block text-base font-semibold mb-2 text-gray-900">
                      Name
                      {survey.contactInfo.nameRequired && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="text"
                      value={contactInfo.name}
                      onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="Enter your name"
                      required={survey.contactInfo.nameRequired}
                    />
                  </div>
                )}

                {/* Email Field */}
                {survey.contactInfo?.collectEmail && (
                  <div className="mb-6">
                    <label className="block text-base font-semibold mb-2 text-gray-900">
                      Email
                      {survey.contactInfo.emailRequired && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="email"
                      value={contactInfo.email}
                      onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      placeholder="Enter your email"
                      required={survey.contactInfo.emailRequired}
                    />
                  </div>
                )}

                {/* Phone Field */}
                {survey.contactInfo?.collectPhone && (
                  <div className="mb-6">
                    <label className="block text-base font-semibold mb-2 text-gray-900">
                      Phone
                      {survey.contactInfo.phoneRequired && <span className="text-red-500"> *</span>}
                    </label>
                    <input
                      type="tel"
                      value={contactInfo.phone}
                      onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
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
              <div className="p-4 bg-red-50 border border-red-300 rounded-lg text-red-700 mb-6 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-4 justify-end">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="px-8 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className={`px-8 py-3 rounded-lg font-semibold text-white ${
                  submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
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
