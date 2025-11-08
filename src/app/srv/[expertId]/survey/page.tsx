'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Survey, SurveyQuestion, QuestionType, SurveyContactInfo } from '@/types';

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const expertId = params.expertId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contactInfo, setContactInfo] = useState<SurveyContactInfo>({
    collectName: false,
    nameRequired: false,
    collectEmail: false,
    emailRequired: false,
    collectPhone: false,
    phoneRequired: false,
  });
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSurvey();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expertId]);

  const fetchSurvey = async () => {
    try {
      console.log('[DBG][edit-survey] Fetching survey for expert:', expertId);
      const response = await fetch(`/api/srv/experts/${expertId}/survey`);
      const data = await response.json();

      if (data.success) {
        if (data.data) {
          setTitle(data.data.title || '');
          setDescription(data.data.description || '');
          setContactInfo(
            data.data.contactInfo || {
              collectName: false,
              nameRequired: false,
              collectEmail: false,
              emailRequired: false,
              collectPhone: false,
              phoneRequired: false,
            }
          );
          setQuestions(data.data.questions || []);
          console.log('[DBG][edit-survey] Survey loaded:', data.data);
        } else {
          // No survey exists yet, set defaults
          setTitle('Tell us about yourself');
          setDescription(
            'Help us understand you better so we can provide a personalized experience.'
          );
          setContactInfo({
            collectName: false,
            nameRequired: false,
            collectEmail: false,
            emailRequired: false,
            collectPhone: false,
            phoneRequired: false,
          });
          setQuestions([]);
          console.log('[DBG][edit-survey] No survey found, using defaults');
        }
      } else {
        setError(data.error || 'Failed to load survey');
      }
    } catch (err) {
      console.error('[DBG][edit-survey] Error fetching survey:', err);
      setError('Failed to load survey');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!title.trim()) {
      setError('Survey title is required');
      return;
    }

    if (questions.length === 0) {
      setError('Please add at least one question');
      return;
    }

    // Validate each question
    for (const q of questions) {
      if (!q.questionText.trim()) {
        setError('All questions must have text');
        return;
      }
      if (q.type === 'multiple-choice' && (!q.options || q.options.length < 2)) {
        setError('Multiple choice questions must have at least 2 options');
        return;
      }
    }

    setSaving(true);

    try {
      console.log('[DBG][edit-survey] Saving survey...');
      const response = await fetch(`/api/srv/experts/${expertId}/survey`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          contactInfo,
          questions,
        }),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[DBG][edit-survey] Survey saved successfully');
        setSuccessMessage('Survey saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(data.error || 'Failed to save survey');
      }
    } catch (err) {
      console.error('[DBG][edit-survey] Error saving survey:', err);
      setError('Failed to save survey');
    } finally {
      setSaving(false);
    }
  };

  const addQuestion = (type: QuestionType) => {
    const newQuestion: SurveyQuestion = {
      id: `q${Date.now()}`,
      questionText: '',
      type,
      required: true,
      order: questions.length + 1,
      options:
        type === 'multiple-choice'
          ? [
              { id: `opt1`, label: '' },
              { id: `opt2`, label: '' },
            ]
          : undefined,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId: string, updates: Partial<SurveyQuestion>) => {
    setQuestions(questions.map(q => (q.id === questionId ? { ...q, ...updates } : q)));
  };

  const deleteQuestion = (questionId: string) => {
    const filtered = questions.filter(q => q.id !== questionId);
    // Reorder remaining questions
    const reordered = filtered.map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(reordered);
  };

  const moveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questions.length - 1)
    ) {
      return;
    }

    const newQuestions = [...questions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];

    // Update order property
    const reordered = newQuestions.map((q, idx) => ({ ...q, order: idx + 1 }));
    setQuestions(reordered);
  };

  const addOption = (questionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id === questionId && q.options) {
          const newOptionId = `opt${q.options.length + 1}`;
          return {
            ...q,
            options: [...q.options, { id: newOptionId, label: '' }],
          };
        }
        return q;
      })
    );
  };

  const updateOption = (questionId: string, optionId: string, label: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: q.options.map(opt => (opt.id === optionId ? { ...opt, label } : opt)),
          };
        }
        return q;
      })
    );
  };

  const deleteOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id === questionId && q.options) {
          return {
            ...q,
            options: q.options.filter(opt => opt.id !== optionId),
          };
        }
        return q;
      })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading survey...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/srv/${expertId}`}
            className="text-blue-600 hover:text-blue-700 text-sm mb-3 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Edit Survey</h1>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-6 py-2 ${
                saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white rounded-lg font-medium transition-colors`}
            >
              {saving ? 'Saving...' : 'Save Survey'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-green-400 text-xl">✓</span>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <span className="text-red-400 text-xl">⚠️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Survey Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Survey Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Survey Title *</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Tell us about yourself"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Help us understand you better..."
              />
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contact Information to Collect</h2>
          <p className="text-sm text-gray-600 mb-4">
            Select what information you&apos;d like to collect from respondents. These fields will
            appear at the top of your survey.
          </p>
          <div className="space-y-4">
            {/* Name */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={contactInfo.collectName}
                    onChange={e =>
                      setContactInfo({
                        ...contactInfo,
                        collectName: e.target.checked,
                        nameRequired: e.target.checked ? contactInfo.nameRequired : false,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Collect Name</span>
                </label>
              </div>
              {contactInfo.collectName && (
                <div className="ml-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contactInfo.nameRequired}
                      onChange={e =>
                        setContactInfo({ ...contactInfo, nameRequired: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Required</span>
                  </label>
                </div>
              )}
            </div>

            {/* Email */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={contactInfo.collectEmail}
                    onChange={e =>
                      setContactInfo({
                        ...contactInfo,
                        collectEmail: e.target.checked,
                        emailRequired: e.target.checked ? contactInfo.emailRequired : false,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Collect Email</span>
                </label>
              </div>
              {contactInfo.collectEmail && (
                <div className="ml-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contactInfo.emailRequired}
                      onChange={e =>
                        setContactInfo({ ...contactInfo, emailRequired: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Required</span>
                  </label>
                </div>
              )}
            </div>

            {/* Phone */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={contactInfo.collectPhone}
                    onChange={e =>
                      setContactInfo({
                        ...contactInfo,
                        collectPhone: e.target.checked,
                        phoneRequired: e.target.checked ? contactInfo.phoneRequired : false,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Collect Phone</span>
                </label>
              </div>
              {contactInfo.collectPhone && (
                <div className="ml-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={contactInfo.phoneRequired}
                      onChange={e =>
                        setContactInfo({ ...contactInfo, phoneRequired: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-600">Required</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Questions</h2>
            <div className="flex gap-2">
              <button
                onClick={() => addQuestion('text')}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                + Add Open Question
              </button>
              <button
                onClick={() => addQuestion('multiple-choice')}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                + Add Multiple Choice
              </button>
            </div>
          </div>

          {questions.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-600 mb-4">Add your first question to get started</p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions
                .sort((a, b) => a.order - b.order)
                .map((question, index) => (
                  <div key={question.id} className="border border-gray-200 rounded-lg p-6">
                    {/* Question Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-500">Q{index + 1}</span>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            question.type === 'multiple-choice'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {question.type === 'multiple-choice' ? 'Multiple Choice' : 'Open Text'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => moveQuestion(question.id, 'up')}
                          disabled={index === 0}
                          className={`p-2 ${
                            index === 0 ? 'text-gray-300' : 'text-gray-600 hover:text-blue-600'
                          } transition-colors`}
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => moveQuestion(question.id, 'down')}
                          disabled={index === questions.length - 1}
                          className={`p-2 ${
                            index === questions.length - 1
                              ? 'text-gray-300'
                              : 'text-gray-600 hover:text-blue-600'
                          } transition-colors`}
                          title="Move down"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => deleteQuestion(question.id)}
                          className="p-2 text-red-600 hover:text-red-700 transition-colors"
                          title="Delete question"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {/* Question Text */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text *
                      </label>
                      <input
                        type="text"
                        value={question.questionText}
                        onChange={e =>
                          updateQuestion(question.id, { questionText: e.target.value })
                        }
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., What is your age?"
                      />
                    </div>

                    {/* Required Toggle */}
                    <div className="mb-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={question.required}
                          onChange={e =>
                            updateQuestion(question.id, { required: e.target.checked })
                          }
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Required question</span>
                      </label>
                    </div>

                    {/* Multiple Choice Options */}
                    {question.type === 'multiple-choice' && (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Options *
                          </label>
                          <button
                            onClick={() => addOption(question.id)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                          >
                            + Add Option
                          </button>
                        </div>
                        <div className="space-y-2">
                          {question.options?.map((option, optIndex) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <span className="text-sm text-gray-500 w-8">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              <input
                                type="text"
                                value={option.label}
                                onChange={e => updateOption(question.id, option.id, e.target.value)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={`Option ${optIndex + 1}`}
                              />
                              {question.options && question.options.length > 2 && (
                                <button
                                  onClick={() => deleteOption(question.id, option.id)}
                                  className="text-red-600 hover:text-red-700 p-2"
                                  title="Delete option"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Text Question Preview */}
                    {question.type === 'text' && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Preview:</p>
                        <textarea
                          disabled
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                          placeholder="User will type their answer here..."
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Survey Actions */}
        <div className="space-y-4 mb-6">
          {/* View Responses */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-green-400 text-xl">📊</span>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-green-800">View Survey Responses</h3>
                <p className="text-sm text-green-700 mt-1">
                  Track, filter, and manage responses from users who have completed your survey.
                </p>
                <Link
                  href={`/srv/${expertId}/survey/responses`}
                  className="inline-block mt-2 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors font-medium"
                >
                  View Responses Dashboard
                </Link>
              </div>
            </div>
          </div>

          {/* Preview Link */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-blue-400 text-xl">ℹ️</span>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">Preview Your Survey</h3>
                <p className="text-sm text-blue-700 mt-1">
                  After saving, you can preview how your survey looks to users by visiting{' '}
                  <Link
                    href={`/experts/${expertId}/survey`}
                    className="underline font-medium"
                    target="_blank"
                  >
                    /experts/{expertId}/survey
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button (Bottom) */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`px-6 py-3 ${
              saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            } text-white rounded-lg font-medium transition-colors`}
          >
            {saving ? 'Saving...' : 'Save Survey'}
          </button>
        </div>
      </div>
    </div>
  );
}
