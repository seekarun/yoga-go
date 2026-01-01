'use client';

import { useState } from 'react';
import type { SurveyQuestion, SurveyContactInfo, QuestionOption } from '@/types';

interface SurveyWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: SurveyWizardData) => Promise<void>;
  isSubmitting?: boolean;
}

export interface SurveyWizardData {
  title: string;
  description?: string;
  contactInfo: SurveyContactInfo;
  questions: SurveyQuestion[];
}

type WizardStep = 'details' | 'question';

const defaultContactInfo: SurveyContactInfo = {
  collectName: true,
  nameRequired: false,
  collectEmail: true,
  emailRequired: true,
  collectPhone: false,
  phoneRequired: false,
};

const createNewQuestion = (order: number): SurveyQuestion => ({
  id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  questionText: '',
  type: 'multiple-choice',
  options: [
    { id: `opt-${Date.now()}-1`, label: '' },
    { id: `opt-${Date.now()}-2`, label: '' },
  ],
  required: true,
  order,
});

export default function SurveyWizardModal({
  isOpen,
  onClose,
  onComplete,
  isSubmitting = false,
}: SurveyWizardModalProps) {
  // Wizard state
  const [step, setStep] = useState<WizardStep>('details');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Form data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState<SurveyContactInfo>(defaultContactInfo);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([createNewQuestion(0)]);

  // Validation
  const [error, setError] = useState('');

  const resetForm = () => {
    setStep('details');
    setCurrentQuestionIndex(0);
    setTitle('');
    setDescription('');
    setContactInfo(defaultContactInfo);
    setQuestions([createNewQuestion(0)]);
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateDetails = (): boolean => {
    if (!title.trim()) {
      setError('Please enter a survey title');
      return false;
    }
    setError('');
    return true;
  };

  const validateQuestion = (): boolean => {
    const question = questions[currentQuestionIndex];
    if (!question.questionText.trim()) {
      setError('Please enter the question text');
      return false;
    }
    if (question.type === 'multiple-choice') {
      const emptyOptions = (question.options || []).filter(o => !o.label.trim());
      if (emptyOptions.length > 0) {
        setError('Please fill in all option labels');
        return false;
      }
      if ((question.options || []).length < 2) {
        setError('Multiple choice questions need at least 2 options');
        return false;
      }
    }
    setError('');
    return true;
  };

  const handleNextFromDetails = () => {
    if (validateDetails()) {
      setStep('question');
    }
  };

  const handleAddAnotherQuestion = () => {
    if (validateQuestion()) {
      const newQuestion = createNewQuestion(questions.length);
      setQuestions([...questions, newQuestion]);
      setCurrentQuestionIndex(questions.length);
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      setStep('details');
    }
  };

  const handleDone = async () => {
    if (!validateQuestion()) return;

    await onComplete({
      title: title.trim(),
      description: description.trim() || undefined,
      contactInfo,
      questions,
    });

    resetForm();
  };

  const updateCurrentQuestion = (field: keyof SurveyQuestion, value: unknown) => {
    setQuestions(
      questions.map((q, i) => {
        if (i !== currentQuestionIndex) return q;
        const updated = { ...q, [field]: value };
        if (field === 'type' && value === 'text') {
          updated.options = undefined;
        }
        if (field === 'type' && value === 'multiple-choice' && !updated.options?.length) {
          updated.options = [
            { id: `opt-${Date.now()}-1`, label: '' },
            { id: `opt-${Date.now()}-2`, label: '' },
          ];
        }
        return updated;
      })
    );
  };

  const handleAddOption = () => {
    setQuestions(
      questions.map((q, i) => {
        if (i !== currentQuestionIndex) return q;
        return {
          ...q,
          options: [...(q.options || []), { id: `opt-${Date.now()}`, label: '' }],
        };
      })
    );
  };

  const handleRemoveOption = (optionId: string) => {
    const question = questions[currentQuestionIndex];
    if ((question.options || []).length <= 2) {
      setError('Multiple choice questions need at least 2 options');
      return;
    }
    setQuestions(
      questions.map((q, i) => {
        if (i !== currentQuestionIndex) return q;
        return {
          ...q,
          options: (q.options || []).filter(o => o.id !== optionId),
        };
      })
    );
  };

  const handleOptionChange = (optionId: string, label: string) => {
    setQuestions(
      questions.map((q, i) => {
        if (i !== currentQuestionIndex) return q;
        return {
          ...q,
          options: (q.options || []).map((o: QuestionOption) =>
            o.id === optionId ? { ...o, label } : o
          ),
        };
      })
    );
  };

  if (!isOpen) return null;

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-xl w-full shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {step === 'details' ? 'Create New Survey' : `Question ${currentQuestionIndex + 1}`}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {step === 'details'
                  ? 'Set up your survey details'
                  : `${questions.length} question${questions.length > 1 ? 's' : ''} so far`}
              </p>
            </div>
            <button
              onClick={handleClose}
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
        </div>

        {/* Content */}
        <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Survey Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g., Customer Feedback Survey"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of your survey"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Contact Info */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  What contact info should we collect?
                </label>
                <div className="space-y-3 bg-gray-50 rounded-lg p-4">
                  {/* Name */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={contactInfo.collectName}
                        onChange={e =>
                          setContactInfo({ ...contactInfo, collectName: e.target.checked })
                        }
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span className="text-sm text-gray-700">Name</span>
                    </label>
                    {contactInfo.collectName && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={contactInfo.nameRequired}
                          onChange={e =>
                            setContactInfo({ ...contactInfo, nameRequired: e.target.checked })
                          }
                          className="w-3.5 h-3.5 rounded"
                        />
                        Required
                      </label>
                    )}
                  </div>
                  {/* Email */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={contactInfo.collectEmail}
                        onChange={e =>
                          setContactInfo({ ...contactInfo, collectEmail: e.target.checked })
                        }
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span className="text-sm text-gray-700">Email</span>
                    </label>
                    {contactInfo.collectEmail && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={contactInfo.emailRequired}
                          onChange={e =>
                            setContactInfo({ ...contactInfo, emailRequired: e.target.checked })
                          }
                          className="w-3.5 h-3.5 rounded"
                        />
                        Required
                      </label>
                    )}
                  </div>
                  {/* Phone */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={contactInfo.collectPhone}
                        onChange={e =>
                          setContactInfo({ ...contactInfo, collectPhone: e.target.checked })
                        }
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--color-primary)' }}
                      />
                      <span className="text-sm text-gray-700">Phone</span>
                    </label>
                    {contactInfo.collectPhone && (
                      <label className="flex items-center gap-1.5 text-xs text-gray-500">
                        <input
                          type="checkbox"
                          checked={contactInfo.phoneRequired}
                          onChange={e =>
                            setContactInfo({ ...contactInfo, phoneRequired: e.target.checked })
                          }
                          className="w-3.5 h-3.5 rounded"
                        />
                        Required
                      </label>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'question' && currentQuestion && (
            <div className="space-y-5">
              {/* Question Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Question <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={currentQuestion.questionText}
                  onChange={e => updateCurrentQuestion('questionText', e.target.value)}
                  placeholder="Enter your question"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Question Type */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Answer Type
                  </label>
                  <select
                    value={currentQuestion.type}
                    onChange={e => updateCurrentQuestion('type', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="multiple-choice">Multiple Choice</option>
                    <option value="text">Text Answer</option>
                  </select>
                </div>
                <div className="pt-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={currentQuestion.required}
                      onChange={e => updateCurrentQuestion('required', e.target.checked)}
                      className="w-4 h-4 rounded"
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    <span className="text-sm text-gray-700">Required</span>
                  </label>
                </div>
              </div>

              {/* Multiple Choice Options */}
              {currentQuestion.type === 'multiple-choice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Answer Options
                  </label>
                  <div className="space-y-2">
                    {(currentQuestion.options || []).map((option, idx) => (
                      <div key={option.id} className="flex items-center gap-2">
                        <span className="text-sm text-gray-400 w-5">{idx + 1}.</span>
                        <input
                          type="text"
                          value={option.label}
                          onChange={e => handleOptionChange(option.id, e.target.value)}
                          placeholder={`Option ${idx + 1}`}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(option.id)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="text-sm font-medium hover:opacity-80"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      + Add Option
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center justify-between">
            <div>
              {step === 'question' && (
                <button
                  type="button"
                  onClick={handlePreviousQuestion}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Back
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step === 'details' && (
                <button
                  type="button"
                  onClick={handleNextFromDetails}
                  className="px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90"
                  style={{ background: 'var(--color-primary)' }}
                >
                  Next: Add Questions
                </button>
              )}
              {step === 'question' && (
                <>
                  <button
                    type="button"
                    onClick={handleAddAnotherQuestion}
                    className="px-4 py-2.5 text-sm font-medium border rounded-lg hover:bg-gray-50"
                    style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}
                  >
                    + Add Another Question
                  </button>
                  <button
                    type="button"
                    onClick={handleDone}
                    disabled={isSubmitting}
                    className="px-5 py-2.5 text-white text-sm font-medium rounded-lg transition-opacity hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'var(--color-primary)' }}
                  >
                    {isSubmitting ? 'Creating...' : 'Done'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
