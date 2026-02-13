/**
 * Ad Campaign Types for CallyGo
 * Facebook/Instagram ad campaign management via Meta Marketing API
 */

// ============================================
// Enums & Literals
// ============================================

export type AdGoal = "traffic" | "lead_generation";

export type AdCampaignStatus =
  | "draft"
  | "approved"
  | "submitting"
  | "active"
  | "paused"
  | "completed"
  | "failed";

export type AdPlatform = "facebook" | "instagram" | "both";

export type AdBundleId = "bundle_50" | "bundle_100" | "bundle_200";

// ============================================
// Ad Bundles (fixed pricing)
// ============================================

export interface AdBundle {
  id: AdBundleId;
  name: string;
  totalAmountCents: number;
  adSpendCents: number;
  serviceFeeCents: number;
  currency: string;
}

export const AD_BUNDLES: Record<AdBundleId, AdBundle> = {
  bundle_50: {
    id: "bundle_50",
    name: "$50 Ad Pack",
    totalAmountCents: 5000,
    adSpendCents: 4000,
    serviceFeeCents: 1000,
    currency: "usd",
  },
  bundle_100: {
    id: "bundle_100",
    name: "$100 Ad Pack",
    totalAmountCents: 10000,
    adSpendCents: 8000,
    serviceFeeCents: 2000,
    currency: "usd",
  },
  bundle_200: {
    id: "bundle_200",
    name: "$200 Ad Pack",
    totalAmountCents: 20000,
    adSpendCents: 16000,
    serviceFeeCents: 4000,
    currency: "usd",
  },
};

// ============================================
// Targeting & Creative
// ============================================

export interface AdTargeting {
  locations: Array<{
    key: string;
    name: string;
    type: string;
  }>;
  ageMin: number;
  ageMax: number;
  genders: number[]; // 0=all, 1=male, 2=female
  interests: Array<{
    id: string;
    name: string;
  }>;
}

export interface AdCreative {
  headline: string; // max 40 chars
  primaryText: string; // max 125 chars
  description: string;
  callToAction: string;
  linkUrl: string;
  imageUrl?: string;
}

// ============================================
// Metrics
// ============================================

export interface AdMetrics {
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  spendCents: number;
  leads: number;
  costPerLeadCents: number;
}

// ============================================
// Campaign Entity
// ============================================

export interface AdCampaign {
  id: string;
  tenantId: string;
  name: string;
  goal: AdGoal;
  platform: AdPlatform;
  bundleId: AdBundleId;
  budgetCents: number;
  status: AdCampaignStatus;
  targeting: AdTargeting;
  creative: AdCreative;
  // Meta API IDs (populated after submission)
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaAdId?: string;
  metaCreativeId?: string;
  metaLeadFormId?: string;
  // Metrics (populated by cron sync)
  metrics?: AdMetrics;
  // Error info
  failureReason?: string;
  // Timestamps
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  completedAt?: string;
}

// ============================================
// Ad Credit & Transactions
// ============================================

export interface AdCredit {
  tenantId: string;
  balanceCents: number;
  totalPurchasedCents: number;
  totalSpentCents: number;
  updatedAt: string;
}

export type AdTransactionType = "purchase" | "spend" | "refund";

export interface AdTransaction {
  id: string;
  tenantId: string;
  type: AdTransactionType;
  amountCents: number;
  balanceAfterCents: number;
  description: string;
  // Reference IDs
  campaignId?: string;
  stripeSessionId?: string;
  bundleId?: AdBundleId;
  createdAt: string;
}

// ============================================
// AI Generation Types
// ============================================

export interface AdCampaignGenerationInput {
  goal: AdGoal;
  platform: AdPlatform;
  bundleId: AdBundleId;
  businessName: string;
  businessDescription?: string;
  services?: string;
  location?: string;
  landingPageUrl: string;
}

export interface AdCampaignGenerationOutput {
  name: string;
  targeting: AdTargeting;
  creative: AdCreative;
}
