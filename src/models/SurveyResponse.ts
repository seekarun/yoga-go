import mongoose, { Schema } from 'mongoose';
import type { SurveyResponse, SurveyAnswer, SurveyResponseContactInfo } from '@/types';

export interface SurveyResponseDocument extends Omit<SurveyResponse, 'id'> {
  _id: string;
}

const SurveyAnswerSchema = new Schema<SurveyAnswer>(
  {
    questionId: { type: String, required: true },
    answer: { type: String, required: true },
  },
  { _id: false }
);

const SurveyResponseContactInfoSchema = new Schema<SurveyResponseContactInfo>(
  {
    name: String,
    email: String,
    phone: String,
  },
  { _id: false }
);

const SurveyResponseSchema = new Schema<SurveyResponseDocument>(
  {
    _id: { type: String, required: true },
    surveyId: { type: String, required: true, index: true },
    expertId: { type: String, required: true, index: true },
    userId: { type: String, index: true },
    contactInfo: SurveyResponseContactInfoSchema,
    answers: [SurveyAnswerSchema],
    submittedAt: { type: String, required: true },
  },
  {
    timestamps: true,
    collection: 'survey_responses',
  }
);

// Indexes for common queries
SurveyResponseSchema.index({ surveyId: 1, userId: 1 });
SurveyResponseSchema.index({ expertId: 1, submittedAt: -1 });

// Prevent model recompilation in development
export default mongoose.models.SurveyResponse ||
  mongoose.model<SurveyResponseDocument>('SurveyResponse', SurveyResponseSchema);
