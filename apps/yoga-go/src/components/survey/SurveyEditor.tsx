'use client';

import { useState } from 'react';
import type { Survey, SurveyQuestion, SurveyContactInfo, QuestionOption } from '@/types';

interface SurveyEditorProps {
  initialData?: Partial<Survey>;
  onSave: (data: SurveyFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface SurveyFormData {
  title: string;
  description?: string;
  contactInfo: SurveyContactInfo;
  questions: SurveyQuestion[];
}

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

export default function SurveyEditor({
  initialData,
  onSave,
  onCancel,
  isLoading = false,
  mode,
}: SurveyEditorProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [contactInfo, setContactInfo] = useState<SurveyContactInfo>(
    initialData?.contactInfo || defaultContactInfo
  );
  const [questions, setQuestions] = useState<SurveyQuestion[]>(
    initialData?.questions?.length ? initialData.questions : [createNewQuestion(0)]
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const handleAddQuestion = () => {
    setQuestions([...questions, createNewQuestion(questions.length)]);
  };

  const handleRemoveQuestion = (questionId: string) => {
    if (questions.length === 1) {
      alert('Survey must have at least one question');
      return;
    }
    setQuestions(questions.filter(q => q.id !== questionId).map((q, i) => ({ ...q, order: i })));
  };

  const handleQuestionChange = (
    questionId: string,
    field: keyof SurveyQuestion,
    value: unknown
  ) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        const updated = { ...q, [field]: value };
        // If changing to text type, clear options
        if (field === 'type' && value === 'text') {
          updated.options = undefined;
        }
        // If changing to multiple-choice, add default options
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

  const handleAddOption = (questionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: [...(q.options || []), { id: `opt-${Date.now()}`, label: '' }],
        };
      })
    );
  };

  const handleRemoveOption = (questionId: string, optionId: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        const newOptions = (q.options || []).filter(o => o.id !== optionId);
        if (newOptions.length < 2) {
          alert('Multiple choice questions must have at least 2 options');
          return q;
        }
        return { ...q, options: newOptions };
      })
    );
  };

  const handleOptionChange = (questionId: string, optionId: string, label: string) => {
    setQuestions(
      questions.map(q => {
        if (q.id !== questionId) return q;
        return {
          ...q,
          options: (q.options || []).map((o: QuestionOption) =>
            o.id === optionId ? { ...o, label } : o
          ),
        };
      })
    );
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === questions.length - 1) return;

    const newQuestions = [...questions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
    setQuestions(newQuestions.map((q, i) => ({ ...q, order: i })));
  };

  const validate = (): boolean => {
    const errors: string[] = [];

    if (!title.trim()) {
      errors.push('Survey title is required');
    }

    if (questions.length === 0) {
      errors.push('Survey must have at least one question');
    }

    questions.forEach((q, i) => {
      if (!q.questionText.trim()) {
        errors.push(`Question ${i + 1}: Question text is required`);
      }
      if (q.type === 'multiple-choice') {
        if (!q.options || q.options.length < 2) {
          errors.push(`Question ${i + 1}: Multiple choice questions must have at least 2 options`);
        } else {
          const emptyOptions = q.options.filter(o => !o.label.trim());
          if (emptyOptions.length > 0) {
            errors.push(`Question ${i + 1}: All option labels must be filled in`);
          }
        }
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      contactInfo,
      questions,
    });
  };

  return (
    <div className="space-y-8">
      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
          <ul className="list-disc list-inside text-red-700 text-sm space-y-1">
            {validationErrors.map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Survey Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Survey Details</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Survey Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter survey title"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter a brief description for your survey"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Contact Info Settings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information Collection</h2>
        <p className="text-sm text-gray-600 mb-4">
          Choose what contact information to collect from respondents.
        </p>
        <div className="space-y-4">
          {/* Name */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contactInfo.collectName}
                onChange={e => setContactInfo({ ...contactInfo, collectName: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Collect Name</span>
            </label>
            {contactInfo.collectName && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={contactInfo.nameRequired}
                  onChange={e => setContactInfo({ ...contactInfo, nameRequired: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            )}
          </div>
          {/* Email */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contactInfo.collectEmail}
                onChange={e => setContactInfo({ ...contactInfo, collectEmail: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Collect Email</span>
            </label>
            {contactInfo.collectEmail && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={contactInfo.emailRequired}
                  onChange={e =>
                    setContactInfo({ ...contactInfo, emailRequired: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            )}
          </div>
          {/* Phone */}
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={contactInfo.collectPhone}
                onChange={e => setContactInfo({ ...contactInfo, collectPhone: e.target.checked })}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Collect Phone</span>
            </label>
            {contactInfo.collectPhone && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={contactInfo.phoneRequired}
                  onChange={e =>
                    setContactInfo({ ...contactInfo, phoneRequired: e.target.checked })
                  }
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Required</span>
              </label>
            )}
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Questions</h2>
          <button
            type="button"
            onClick={handleAddQuestion}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Question
          </button>
        </div>

        <div className="space-y-6">
          {questions.map((question, index) => (
            <div key={question.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-4">
                <span className="text-sm font-medium text-gray-500">Question {index + 1}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(question.id, 'up')}
                    disabled={index === 0}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move up"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 15l7-7 7 7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(question.id, 'down')}
                    disabled={index === questions.length - 1}
                    className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                    title="Move down"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(question.id)}
                    className="p-1 text-red-400 hover:text-red-600"
                    title="Delete question"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Question Text <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={question.questionText}
                    onChange={e =>
                      handleQuestionChange(question.id, 'questionText', e.target.value)
                    }
                    placeholder="Enter your question"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      value={question.type}
                      onChange={e => handleQuestionChange(question.id, 'type', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="text">Text Answer</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={question.required}
                        onChange={e =>
                          handleQuestionChange(question.id, 'required', e.target.checked)
                        }
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">Required</span>
                    </label>
                  </div>
                </div>

                {/* Multiple Choice Options */}
                {question.type === 'multiple-choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                    <div className="space-y-2">
                      {(question.options || []).map((option, optIndex) => (
                        <div key={option.id} className="flex items-center gap-2">
                          <span className="text-sm text-gray-400 w-6">{optIndex + 1}.</span>
                          <input
                            type="text"
                            value={option.label}
                            onChange={e =>
                              handleOptionChange(question.id, option.id, e.target.value)
                            }
                            placeholder={`Option ${optIndex + 1}`}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(question.id, option.id)}
                            className="p-2 text-red-400 hover:text-red-600"
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
                        onClick={() => handleAddOption(question.id)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Option
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create Survey' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
