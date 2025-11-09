import mongoose, { Schema } from 'mongoose';
import type { Survey, SurveyQuestion, QuestionOption, SurveyContactInfo } from '@/types';

export interface SurveyDocument extends Omit<Survey, 'id'> {
  _id: string;
}

const QuestionOptionSchema = new Schema<QuestionOption>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
  },
  { _id: false }
);

const SurveyQuestionSchema = new Schema<SurveyQuestion>(
  {
    id: { type: String, required: true },
    questionText: { type: String, required: true },
    type: {
      type: String,
      enum: ['multiple-choice', 'text'],
      required: true,
    },
    options: [QuestionOptionSchema],
    required: { type: Boolean, default: true },
    order: { type: Number, required: true },
  },
  { _id: false }
);

const SurveyContactInfoSchema = new Schema<SurveyContactInfo>(
  {
    collectName: { type: Boolean, default: false },
    nameRequired: { type: Boolean, default: false },
    collectEmail: { type: Boolean, default: false },
    emailRequired: { type: Boolean, default: false },
    collectPhone: { type: Boolean, default: false },
    phoneRequired: { type: Boolean, default: false },
  },
  { _id: false }
);

const SurveySchema = new Schema<SurveyDocument>(
  {
    _id: { type: String, required: true },
    expertId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: String,
    contactInfo: SurveyContactInfoSchema,
    questions: [SurveyQuestionSchema],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    collection: 'surveys',
  }
);

// Indexes for common queries
SurveySchema.index({ expertId: 1, isActive: 1 });

// Prevent model recompilation in development
export default mongoose.models.Survey || mongoose.model<SurveyDocument>('Survey', SurveySchema);
