'use client';

import { useState } from 'react';
import type { Survey } from '@/types';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation - allows digits, spaces, dashes, parentheses, and + prefix
// Minimum 8 digits required
const PHONE_REGEX = /^[+]?[\d\s\-()]{8,}$/;
const hasMinDigits = (phone: string, min: number) => {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= min;
};

interface SurveyResponseWizardProps {
  survey: Survey;
  onSubmit: (contactInfo: Record<string, string>, answers: Record<string, string>) => Promise<void>;
  onCancel: () => void;
  submitting: boolean;
  submitted: boolean;
  error: string | null;
}

type WizardStep = 'contact' | 'question' | 'thanks';

export default function SurveyResponseWizard({
  survey,
  onSubmit,
  onCancel,
  submitting,
  submitted,
  error,
}: SurveyResponseWizardProps) {
  const hasContactInfo =
    survey.contactInfo?.collectName ||
    survey.contactInfo?.collectEmail ||
    survey.contactInfo?.collectPhone;

  const sortedQuestions = [...survey.questions].sort((a, b) => a.order - b.order);

  // Wizard state
  const [step, setStep] = useState<WizardStep>(hasContactInfo ? 'contact' : 'question');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [validationError, setValidationError] = useState('');

  // Form data
  const [contactInfo, setContactInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const currentQuestion = sortedQuestions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === sortedQuestions.length - 1;
  const totalSteps = (hasContactInfo ? 1 : 0) + sortedQuestions.length;
  const currentStepNumber =
    step === 'contact' ? 1 : (hasContactInfo ? 1 : 0) + currentQuestionIndex + 1;

  const validateContactInfo = (): boolean => {
    // Name validation
    if (
      survey.contactInfo?.collectName &&
      survey.contactInfo.nameRequired &&
      !contactInfo.name.trim()
    ) {
      setValidationError('Please enter your name');
      return false;
    }

    // Email validation
    if (survey.contactInfo?.collectEmail) {
      const email = contactInfo.email.trim();
      if (survey.contactInfo.emailRequired && !email) {
        setValidationError('Please enter your email');
        return false;
      }
      if (email && !EMAIL_REGEX.test(email)) {
        setValidationError('Please enter a valid email address');
        return false;
      }
    }

    // Phone validation
    if (survey.contactInfo?.collectPhone) {
      const phone = contactInfo.phone.trim();
      if (survey.contactInfo.phoneRequired && !phone) {
        setValidationError('Please enter your phone number');
        return false;
      }
      if (phone && (!PHONE_REGEX.test(phone) || !hasMinDigits(phone, 8))) {
        setValidationError('Please enter a valid phone number (minimum 8 digits)');
        return false;
      }
    }

    setValidationError('');
    return true;
  };

  const validateQuestion = (): boolean => {
    if (currentQuestion.required && !answers[currentQuestion.id]) {
      setValidationError('Please answer this question');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleNextFromContact = () => {
    if (validateContactInfo()) {
      setStep('question');
    }
  };

  const handleNextQuestion = async () => {
    if (!validateQuestion()) return;

    if (isLastQuestion) {
      await onSubmit(contactInfo, answers);
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    setValidationError('');
    if (step === 'question') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } else if (hasContactInfo) {
        setStep('contact');
      }
    }
  };

  const handleAnswerChange = (answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
    setValidationError('');
  };

  // Show thank you screen
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center shadow-xl">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'var(--color-primary)' }}
          >
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Thank you!</h2>
          <p className="text-gray-600 mb-2">Your response has been submitted successfully.</p>
          <p className="text-gray-400 text-sm">Redirecting you back...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{survey.title}</h2>
              <p className="text-sm text-gray-500">
                Step {currentStepNumber} of {totalSteps}
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300"
              style={{
                width: `${(currentStepNumber / totalSteps) * 100}%`,
                background: 'var(--color-primary)',
              }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 min-h-[280px]">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}
          {validationError && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {validationError}
            </div>
          )}

          {/* Contact Info Step */}
          {step === 'contact' && (
            <div className="space-y-5">
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">Your Information</h3>
                <p className="text-sm text-gray-500">Please tell us a bit about yourself</p>
              </div>

              {survey.contactInfo?.collectName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Name{' '}
                    {survey.contactInfo.nameRequired && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={contactInfo.name}
                    onChange={e => setContactInfo({ ...contactInfo, name: e.target.value })}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
              )}

              {survey.contactInfo?.collectEmail && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Email{' '}
                    {survey.contactInfo.emailRequired && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="email"
                    value={contactInfo.email}
                    onChange={e => setContactInfo({ ...contactInfo, email: e.target.value })}
                    placeholder="Enter your email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}

              {survey.contactInfo?.collectPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone{' '}
                    {survey.contactInfo.phoneRequired && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="tel"
                    value={contactInfo.phone}
                    onChange={e => setContactInfo({ ...contactInfo, phone: e.target.value })}
                    placeholder="Enter your phone number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          )}

          {/* Question Step */}
          {step === 'question' && currentQuestion && (
            <div>
              <div className="mb-6">
                <span className="text-sm text-gray-400 font-medium">
                  Question {currentQuestionIndex + 1} of {sortedQuestions.length}
                </span>
                <h3 className="text-xl font-semibold text-gray-900 mt-1">
                  {currentQuestion.questionText}
                  {currentQuestion.required && <span className="text-red-500 ml-1">*</span>}
                </h3>
              </div>

              {currentQuestion.type === 'multiple-choice' && (
                <div className="space-y-3">
                  {currentQuestion.options?.map(option => (
                    <label
                      key={option.id}
                      className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        answers[currentQuestion.id] === option.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      style={
                        answers[currentQuestion.id] === option.id
                          ? {
                              borderColor: 'var(--color-primary)',
                              background: 'var(--color-primary-light, #f0f9ff)',
                            }
                          : {}
                      }
                    >
                      <input
                        type="radio"
                        name={currentQuestion.id}
                        value={option.id}
                        checked={answers[currentQuestion.id] === option.id}
                        onChange={() => handleAnswerChange(option.id)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                          answers[currentQuestion.id] === option.id
                            ? 'border-blue-500'
                            : 'border-gray-300'
                        }`}
                        style={
                          answers[currentQuestion.id] === option.id
                            ? { borderColor: 'var(--color-primary)' }
                            : {}
                        }
                      >
                        {answers[currentQuestion.id] === option.id && (
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ background: 'var(--color-primary)' }}
                          />
                        )}
                      </div>
                      <span className="text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'text' && (
                <textarea
                  value={answers[currentQuestion.id] || ''}
                  onChange={e => handleAnswerChange(e.target.value)}
                  rows={4}
                  placeholder="Type your answer here..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  autoFocus
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              {step === 'question' && (currentQuestionIndex > 0 || hasContactInfo) && (
                <button
                  type="button"
                  onClick={handlePrevious}
                  className="px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'contact' && (
                <button
                  type="button"
                  onClick={handleNextFromContact}
                  className="px-6 py-2.5 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Next
                </button>
              )}
              {step === 'question' && (
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={submitting}
                  className="px-6 py-2.5 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {submitting ? 'Submitting...' : isLastQuestion ? 'Submit' : 'Next'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
