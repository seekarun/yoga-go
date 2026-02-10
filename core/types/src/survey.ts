// Survey Types - Survey and response types

import type { BaseEntity } from "./base";

/**
 * Question type
 */
export type QuestionType = "multiple-choice" | "text" | "finish";

/**
 * Survey status
 */
export type SurveyStatus = "draft" | "active" | "closed" | "archived";

/**
 * Question option
 */
export interface QuestionOption {
  id: string;
  label: string;
}

/**
 * Maps an answer choice to the next question (for conditional branching)
 * - MC questions: one branch per option + optional default fallback (optionId undefined)
 * - Text questions: single default branch (optionId undefined) → next question or end
 */
export interface QuestionBranch {
  optionId?: string;
  nextQuestionId: string | null; // null = end survey
}

/**
 * Survey question
 */
export interface SurveyQuestion {
  id: string;
  questionText: string;
  type: QuestionType;
  options?: QuestionOption[];
  required: boolean;
  order: number;
  branches?: QuestionBranch[];
  position?: { x: number; y: number };
  inference?: "none" | "process";
}

/**
 * Survey contact info settings
 */
export interface SurveyContactInfo {
  collectName: boolean;
  nameRequired: boolean;
  collectEmail: boolean;
  emailRequired: boolean;
  collectPhone: boolean;
  phoneRequired: boolean;
}

/**
 * Survey entity
 */
export interface Survey extends BaseEntity {
  expertId: string;
  title: string;
  description?: string;
  contactInfo?: SurveyContactInfo;
  questions: SurveyQuestion[];
  status: SurveyStatus;
  closedAt?: string;
  archivedAt?: string;
  responseCount?: number;
  isActive?: boolean;
}

/**
 * Survey answer
 */
export interface SurveyAnswer {
  questionId: string;
  answer: string;
}

/**
 * Survey response contact info
 */
export interface SurveyResponseContactInfo {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Survey response metadata
 */
export interface SurveyResponseMetadata {
  country?: string;
  countryRegion?: string;
  city?: string;
  timezone?: string;
  ip?: string;
  userAgent?: string;
  deviceType?: "mobile" | "tablet" | "desktop" | "unknown";
  browser?: string;
  os?: string;
  language?: string;
  referrer?: string;
}

/**
 * Survey response validation status
 */
export type SurveyResponseValidationStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "skipped";

/**
 * Survey response invalid reasons
 */
export type SurveyResponseInvalidReason =
  | "duplicate_email"
  | "disposable_email"
  | "no_mx_record"
  | "blocklisted"
  | "debounce_invalid"
  | "email_bounced"
  | "complaint"
  | "no_email";

/**
 * Survey response validation
 */
export interface SurveyResponseValidation {
  status: SurveyResponseValidationStatus;
  reason?: SurveyResponseInvalidReason;
  checkedAt?: string;
  emailDomain?: string;
  mxRecordFound?: boolean;
  verificationEmailSent?: boolean;
  previousResponseCount?: number;
}

/**
 * Survey response entity
 */
export interface SurveyResponse extends BaseEntity {
  surveyId: string;
  expertId: string;
  userId?: string;
  contactInfo?: SurveyResponseContactInfo;
  answers: SurveyAnswer[];
  submittedAt: string;
  metadata?: SurveyResponseMetadata;
  validation?: SurveyResponseValidation;
}
