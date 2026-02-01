/**
 * Meta Marketing API Client
 *
 * Handles campaign creation and management for Facebook/Instagram ads
 * Uses the Meta Marketing API v20.0
 *
 * Prerequisites:
 * - Meta Business Account with Marketing API access
 * - Meta App with Marketing API enabled
 * - System User Token with `ads_management` permission
 * - Ad Account linked to app
 */

import type { BoostTargeting, BoostCreative, BoostMetrics } from '@/types';

// Meta API configuration
const META_API_VERSION = 'v20.0';
const META_API_BASE = `https://graph.facebook.com/${META_API_VERSION}`;

// Environment variables
const getConfig = () => {
  const config = {
    accessToken: process.env.META_ACCESS_TOKEN,
    adAccountId: process.env.META_AD_ACCOUNT_ID,
    pixelId: process.env.META_PIXEL_ID,
    pageId: process.env.META_PAGE_ID,
    instagramAccountId: process.env.META_INSTAGRAM_ACCOUNT_ID,
  };

  // Validate required config
  if (!config.accessToken) {
    throw new Error('META_ACCESS_TOKEN is not configured');
  }
  if (!config.adAccountId) {
    throw new Error('META_AD_ACCOUNT_ID is not configured');
  }

  return config;
};

// Meta API error handling
interface MetaApiError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_user_title?: string;
    error_user_msg?: string;
    fbtrace_id?: string;
  };
}

interface MetaApiResponse<T> {
  data?: T;
  error?: MetaApiError['error'];
}

async function metaApiRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>
): Promise<T> {
  const config = getConfig();
  const url = `${META_API_BASE}${endpoint}`;

  console.log(`[DBG][meta-ads] ${method} ${endpoint}`);
  if (body) {
    console.log('[DBG][meta-ads] Request body:', JSON.stringify(body, null, 2));
  }

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (method === 'POST' && body) {
    options.body = JSON.stringify({
      ...body,
      access_token: config.accessToken,
    });
  }

  // For GET requests, add access token to URL
  const requestUrl = method === 'GET' ? `${url}?access_token=${config.accessToken}` : url;

  const response = await fetch(requestUrl, options);
  const data = (await response.json()) as MetaApiResponse<T>;

  if (data.error) {
    console.error('[DBG][meta-ads] API Error:', JSON.stringify(data.error, null, 2));
    const errorDetails = data.error.error_user_msg || data.error.message;
    throw new Error(`Meta API Error: ${errorDetails}`);
  }

  return data as T;
}

// Common country code mappings (wrong code -> correct ISO code)
const COUNTRY_CODE_MAP: Record<string, string> = {
  UK: 'GB', // United Kingdom
  EN: 'GB', // England
  INDIA: 'IN',
  USA: 'US',
  AUSTRALIA: 'AU',
  CANADA: 'CA',
  GERMANY: 'DE',
  FRANCE: 'FR',
  SPAIN: 'ES',
  ITALY: 'IT',
  JAPAN: 'JP',
  CHINA: 'CN',
  BRAZIL: 'BR',
  MEXICO: 'MX',
};

// Valid ISO 3166-1 alpha-2 country codes (subset of most common)
const VALID_COUNTRY_CODES = new Set([
  'US',
  'GB',
  'IN',
  'AU',
  'CA',
  'DE',
  'FR',
  'ES',
  'IT',
  'JP',
  'CN',
  'BR',
  'MX',
  'NL',
  'SE',
  'NO',
  'DK',
  'FI',
  'BE',
  'AT',
  'CH',
  'PL',
  'PT',
  'IE',
  'NZ',
  'SG',
  'HK',
  'KR',
  'TW',
  'TH',
  'MY',
  'PH',
  'ID',
  'VN',
  'ZA',
  'AE',
  'SA',
  'EG',
  'NG',
  'KE',
  'AR',
  'CL',
  'CO',
  'PE',
  'RU',
  'UA',
  'TR',
  'IL',
  'GR',
  'CZ',
  'RO',
  'HU',
]);

function normalizeCountryCode(code: string): string | null {
  const upper = code.toUpperCase().trim();

  // Check if it's in our mapping
  if (COUNTRY_CODE_MAP[upper]) {
    return COUNTRY_CODE_MAP[upper];
  }

  // Check if it's already a valid code
  if (upper.length === 2 && VALID_COUNTRY_CODES.has(upper)) {
    return upper;
  }

  return null;
}

// Campaign Objective mapping
type CampaignObjective = 'OUTCOME_TRAFFIC' | 'OUTCOME_AWARENESS' | 'OUTCOME_LEADS';
type OptimizationGoal = 'LINK_CLICKS' | 'REACH' | 'LANDING_PAGE_VIEWS' | 'IMPRESSIONS';

function getObjectiveForGoal(goal: string): CampaignObjective {
  switch (goal) {
    case 'get_students':
      return 'OUTCOME_TRAFFIC'; // Use TRAFFIC for landing page views
    case 'promote_course':
      return 'OUTCOME_TRAFFIC';
    case 'brand_awareness':
      return 'OUTCOME_AWARENESS';
    default:
      return 'OUTCOME_TRAFFIC';
  }
}

function getOptimizationGoalForObjective(objective: CampaignObjective): OptimizationGoal {
  switch (objective) {
    case 'OUTCOME_TRAFFIC':
      return 'LINK_CLICKS';
    case 'OUTCOME_AWARENESS':
      return 'REACH';
    case 'OUTCOME_LEADS':
      return 'LANDING_PAGE_VIEWS';
    default:
      return 'LINK_CLICKS';
  }
}

// Campaign creation
interface CreateCampaignInput {
  name: string;
  goal: string;
  budget: number; // Daily budget in cents
  currency: string;
}

interface CreateCampaignResult {
  campaignId: string;
}

export async function createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
  const config = getConfig();
  const objective = getObjectiveForGoal(input.goal);

  console.log('[DBG][meta-ads] Creating campaign:', input.name);

  const response = await metaApiRequest<{ id: string }>(
    `/act_${config.adAccountId}/campaigns`,
    'POST',
    {
      name: input.name,
      objective,
      status: 'PAUSED', // Start paused, activate after ad is ready
      special_ad_categories: [], // No special categories for yoga
      // Required field - we use ad set level budgets, not campaign budget optimization
      is_adset_budget_sharing_enabled: false,
    }
  );

  console.log('[DBG][meta-ads] Campaign created:', response.id);
  return { campaignId: response.id };
}

// Ad Set creation with targeting
interface CreateAdSetInput {
  name: string;
  campaignId: string;
  targeting: BoostTargeting;
  dailyBudget: number; // in cents
  currency: string;
  destinationUrl: string;
  goal: string; // boost goal to determine optimization
}

interface CreateAdSetResult {
  adSetId: string;
}

export async function createAdSet(input: CreateAdSetInput): Promise<CreateAdSetResult> {
  const config = getConfig();

  console.log('[DBG][meta-ads] Creating ad set:', input.name);

  // Build targeting spec
  const targetingSpec: Record<string, unknown> = {
    age_min: input.targeting.ageMin || 18,
    age_max: input.targeting.ageMax || 65,
  };

  // Add gender targeting
  if (input.targeting.genders && !input.targeting.genders.includes('all')) {
    // Meta uses 1 for male, 2 for female
    targetingSpec.genders = input.targeting.genders.map(g => (g === 'male' ? 1 : 2));
  }

  // Add geo targeting - normalize and validate country codes
  let validCountries: string[] = [];
  if (input.targeting.locations && input.targeting.locations.length > 0) {
    validCountries = input.targeting.locations
      .map(normalizeCountryCode)
      .filter((code): code is string => code !== null);
  }

  // Default to US if no valid countries
  if (validCountries.length === 0) {
    validCountries = ['US'];
    console.log('[DBG][meta-ads] No valid countries, defaulting to US');
  }

  // Remove duplicates
  const uniqueCountries = [...new Set(validCountries)];
  console.log('[DBG][meta-ads] Normalized countries:', uniqueCountries);
  targetingSpec.geo_locations = {
    countries: uniqueCountries,
  };

  // Note: Interest targeting requires looking up interest IDs via Meta's Targeting Search API
  // For MVP, we skip interest targeting and rely on geo + age + gender
  // TODO: Implement interest lookup via /act_{ad_account_id}/targetingsearch
  if (input.targeting.interests && input.targeting.interests.length > 0) {
    console.log(
      '[DBG][meta-ads] Skipping interest targeting (requires ID lookup):',
      input.targeting.interests
    );
  }

  // Disable Advantage+ audience (use our manual targeting)
  targetingSpec.targeting_automation = {
    advantage_audience: 0,
  };

  // Get optimization goal based on campaign objective
  const objective = getObjectiveForGoal(input.goal);
  const optimizationGoal = getOptimizationGoalForObjective(objective);
  console.log(
    '[DBG][meta-ads] Using optimization goal:',
    optimizationGoal,
    'for objective:',
    objective
  );

  const response = await metaApiRequest<{ id: string }>(
    `/act_${config.adAccountId}/adsets`,
    'POST',
    {
      name: input.name,
      campaign_id: input.campaignId,
      daily_budget: input.dailyBudget, // in cents
      billing_event: 'IMPRESSIONS',
      optimization_goal: optimizationGoal,
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      targeting: targetingSpec,
      status: 'PAUSED',
      // Start immediately when activated
      start_time: new Date().toISOString(),
    }
  );

  console.log('[DBG][meta-ads] Ad set created:', response.id);
  return { adSetId: response.id };
}

// Ad creation with creative
interface CreateAdInput {
  name: string;
  adSetId: string;
  creative: BoostCreative;
  destinationUrl: string;
  expertName: string;
}

interface CreateAdResult {
  adId: string;
}

export async function createAd(input: CreateAdInput): Promise<CreateAdResult> {
  const config = getConfig();

  if (!config.pageId) {
    throw new Error('META_PAGE_ID is not configured. A Facebook Page is required to create ads.');
  }

  console.log('[DBG][meta-ads] Creating ad:', input.name, 'with page:', config.pageId);

  // First, create the ad creative
  // Note: For images, Meta requires uploading first and using image_hash
  // For MVP, we create link ads without images (Meta uses link preview)
  // TODO: Add image upload support via /act_{ad_account_id}/adimages
  const creativeResponse = await metaApiRequest<{ id: string }>(
    `/act_${config.adAccountId}/adcreatives`,
    'POST',
    {
      name: `${input.name} - Creative`,
      object_story_spec: {
        page_id: config.pageId,
        link_data: {
          link: input.destinationUrl,
          message: input.creative.primaryText,
          name: input.creative.headline,
          description: input.creative.description,
          call_to_action: {
            type: mapCallToAction(input.creative.callToAction),
            value: {
              link: input.destinationUrl,
            },
          },
        },
      },
    }
  );

  console.log('[DBG][meta-ads] Creative created:', creativeResponse.id);

  // Now create the ad using the creative
  const adResponse = await metaApiRequest<{ id: string }>(
    `/act_${config.adAccountId}/ads`,
    'POST',
    {
      name: input.name,
      adset_id: input.adSetId,
      creative: { creative_id: creativeResponse.id },
      status: 'PAUSED',
    }
  );

  console.log('[DBG][meta-ads] Ad created:', adResponse.id);
  return { adId: adResponse.id };
}

// Map our CTA to Meta's CTA types
function mapCallToAction(cta: string): string {
  const ctaMap: Record<string, string> = {
    'Learn More': 'LEARN_MORE',
    'Sign Up': 'SIGN_UP',
    'Book Now': 'BOOK_TRAVEL',
    'Get Offer': 'GET_OFFER',
  };
  return ctaMap[cta] || 'LEARN_MORE';
}

// Activate a campaign (set all components to ACTIVE)
export async function activateCampaign(
  campaignId: string,
  adSetId: string,
  adId: string
): Promise<void> {
  console.log('[DBG][meta-ads] Activating campaign:', campaignId);

  // Activate in order: ad -> adset -> campaign
  await metaApiRequest(`/${adId}`, 'POST', { status: 'ACTIVE' });
  await metaApiRequest(`/${adSetId}`, 'POST', { status: 'ACTIVE' });
  await metaApiRequest(`/${campaignId}`, 'POST', { status: 'ACTIVE' });

  console.log('[DBG][meta-ads] Campaign activated');
}

// Pause a campaign
export async function pauseCampaign(campaignId: string): Promise<void> {
  console.log('[DBG][meta-ads] Pausing campaign:', campaignId);

  await metaApiRequest(`/${campaignId}`, 'POST', { status: 'PAUSED' });

  console.log('[DBG][meta-ads] Campaign paused');
}

// Resume a campaign
export async function resumeCampaign(campaignId: string): Promise<void> {
  console.log('[DBG][meta-ads] Resuming campaign:', campaignId);

  await metaApiRequest(`/${campaignId}`, 'POST', { status: 'ACTIVE' });

  console.log('[DBG][meta-ads] Campaign resumed');
}

// Get campaign insights (metrics)
interface CampaignInsights {
  impressions: string;
  clicks: string;
  spend: string;
  actions?: Array<{ action_type: string; value: string }>;
  ctr?: string;
  cpc?: string;
}

export async function getCampaignInsights(campaignId: string): Promise<BoostMetrics> {
  console.log('[DBG][meta-ads] Getting insights for campaign:', campaignId);

  const config = getConfig();

  const response = await metaApiRequest<{ data: CampaignInsights[] }>(
    `/${campaignId}/insights?fields=impressions,clicks,spend,actions,ctr,cpc&access_token=${config.accessToken}`,
    'GET'
  );

  const insights = response.data?.[0];

  if (!insights) {
    // No data yet
    return {
      impressions: 0,
      clicks: 0,
      ctr: 0,
      spend: 0,
      conversions: 0,
      lastSyncedAt: new Date().toISOString(),
    };
  }

  // Find conversions (landing page views, leads, etc.)
  const conversions =
    insights.actions?.find(a => a.action_type === 'landing_page_view' || a.action_type === 'lead')
      ?.value || '0';

  const metrics: BoostMetrics = {
    impressions: parseInt(insights.impressions || '0', 10),
    clicks: parseInt(insights.clicks || '0', 10),
    ctr: parseFloat(insights.ctr || '0'),
    spend: Math.round(parseFloat(insights.spend || '0') * 100), // Convert to cents
    conversions: parseInt(conversions, 10),
    costPerClick: insights.cpc ? Math.round(parseFloat(insights.cpc) * 100) : undefined,
    lastSyncedAt: new Date().toISOString(),
  };

  console.log('[DBG][meta-ads] Insights fetched:', metrics);
  return metrics;
}

// Create full boost campaign (campaign + ad set + ad)
interface CreateBoostCampaignInput {
  boostId: string;
  expertId: string;
  expertName: string;
  goal: string;
  targeting: BoostTargeting;
  creative: BoostCreative;
  budget: number; // Total budget in cents
  currency: string;
  destinationUrl: string;
}

interface CreateBoostCampaignResult {
  campaignId: string;
  adSetId: string;
  adId: string;
}

export async function createBoostCampaign(
  input: CreateBoostCampaignInput
): Promise<CreateBoostCampaignResult> {
  console.log('[DBG][meta-ads] Creating full boost campaign:', input.boostId);

  // Validate all requirements upfront
  const config = getConfig();
  const validationErrors: string[] = [];

  if (!config.accessToken) validationErrors.push('META_ACCESS_TOKEN is not set');
  if (!config.adAccountId) validationErrors.push('META_AD_ACCOUNT_ID is not set');
  if (!config.pageId) validationErrors.push('META_PAGE_ID is not set');

  if (validationErrors.length > 0) {
    throw new Error(`Meta Ads configuration incomplete: ${validationErrors.join(', ')}`);
  }

  console.log('[DBG][meta-ads] Config validated:', {
    adAccountId: config.adAccountId,
    pageId: config.pageId,
    hasAccessToken: !!config.accessToken,
  });

  // Calculate daily budget
  // Meta requires minimum ~$1.50-2.00/day depending on country
  // Set minimum to 200 cents ($2) to be safe across all currencies
  const MIN_DAILY_BUDGET = 200; // cents
  const maxDays = Math.floor(input.budget / MIN_DAILY_BUDGET);
  const daysToRun = Math.max(1, Math.min(maxDays, 7)); // 1-7 days based on budget
  const dailyBudget = Math.max(MIN_DAILY_BUDGET, Math.ceil(input.budget / daysToRun));

  console.log('[DBG][meta-ads] Budget calculation:', {
    totalBudget: input.budget,
    daysToRun,
    dailyBudget,
    currency: input.currency,
  });

  // 1. Create campaign
  const { campaignId } = await createCampaign({
    name: `YogaGuru Boost - ${input.expertName} - ${input.goal}`,
    goal: input.goal,
    budget: dailyBudget,
    currency: input.currency,
  });

  // 2. Create ad set with targeting
  const { adSetId } = await createAdSet({
    name: `${input.expertName} - ${input.goal} - AdSet`,
    campaignId,
    targeting: input.targeting,
    dailyBudget,
    currency: input.currency,
    destinationUrl: input.destinationUrl,
    goal: input.goal,
  });

  // 3. Create ad with creative
  const { adId } = await createAd({
    name: `${input.expertName} - ${input.goal} - Ad`,
    adSetId,
    creative: input.creative,
    destinationUrl: input.destinationUrl,
    expertName: input.expertName,
  });

  console.log('[DBG][meta-ads] Boost campaign created:', {
    campaignId,
    adSetId,
    adId,
  });

  return { campaignId, adSetId, adId };
}

// Check if Meta Ads is configured
export function isMetaAdsConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}
