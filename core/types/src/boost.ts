// Boost Types - Discoverability boost/advertising types

import type { BaseEntity } from "./base";

/**
 * Boost goal options
 */
export type BoostGoal = "get_students" | "promote_course" | "brand_awareness";

/**
 * Boost status lifecycle
 */
export type BoostStatus =
  | "draft"
  | "pending_payment"
  | "pending_approval"
  | "active"
  | "paused"
  | "completed"
  | "rejected"
  | "failed";

/**
 * Boost targeting configuration
 */
export interface BoostTargeting {
  ageMin?: number;
  ageMax?: number;
  genders?: ("male" | "female" | "all")[];
  locations?: string[];
  interests?: string[];
  customAudiences?: string[];
}

/**
 * Boost creative content
 */
export interface BoostCreative {
  headline: string;
  primaryText: string;
  description?: string;
  callToAction: string;
  imageUrl?: string;
  videoUrl?: string;
}

/**
 * Boost performance metrics
 */
export interface BoostMetrics {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  conversions: number;
  costPerClick?: number;
  costPerConversion?: number;
  lastSyncedAt: string;
}

/**
 * Boost entity
 */
export interface Boost extends BaseEntity {
  expertId: string;
  goal: BoostGoal;
  courseId?: string;
  budget: number;
  dailyBudget?: number;
  spentAmount: number;
  currency: string;
  status: BoostStatus;
  statusMessage?: string;
  startDate?: string;
  endDate?: string;
  targeting: BoostTargeting;
  creative: BoostCreative;
  alternativeCreatives?: BoostCreative[];
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaAdId?: string;
  metrics?: BoostMetrics;
  submittedAt?: string;
  approvedAt?: string;
  pausedAt?: string;
  completedAt?: string;
}

/**
 * Boost list result
 */
export interface BoostListResult {
  boosts: Boost[];
  totalCount: number;
  activeCount: number;
  lastKey?: string;
}
