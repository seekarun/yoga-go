/**
 * Meta Marketing API Wrapper for CallyGo
 * Manages Facebook/Instagram ad campaigns via Meta's Marketing API
 * Uses raw fetch (matches openai.ts pattern)
 */

import type { AdCampaign, AdMetrics, AdTargeting, AdCreative } from "@/types";

const META_API_BASE = "https://graph.facebook.com/v21.0";

// ============================================
// Env Helpers
// ============================================

function getAccessToken(): string {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) {
    throw new Error("META_ACCESS_TOKEN environment variable is not set");
  }
  return token;
}

function getAdAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) {
    throw new Error("META_AD_ACCOUNT_ID environment variable is not set");
  }
  return id;
}

function getPageId(): string {
  const id = process.env.META_PAGE_ID;
  if (!id) {
    throw new Error("META_PAGE_ID environment variable is not set");
  }
  return id;
}

// ============================================
// Meta API Response Types
// ============================================

interface MetaApiResponse {
  id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
  };
}

interface MetaInsightsResponse {
  data?: Array<{
    impressions?: string;
    reach?: string;
    clicks?: string;
    ctr?: string;
    cpc?: string;
    spend?: string;
    actions?: Array<{ action_type: string; value: string }>;
  }>;
}

// ============================================
// Generic Meta API caller
// ============================================

async function metaApiPost(
  endpoint: string,
  params: Record<string, string>,
): Promise<MetaApiResponse> {
  const token = getAccessToken();
  const url = `${META_API_BASE}${endpoint}`;

  console.log(`[DBG][meta-ads] POST ${endpoint}`);

  const body = new URLSearchParams({ ...params, access_token: token });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await response.json()) as MetaApiResponse;

  if (!response.ok || data.error) {
    const msg = data.error?.message || `Meta API error: ${response.status}`;
    console.error(`[DBG][meta-ads] Error on ${endpoint}:`, msg);
    throw new Error(msg);
  }

  console.log(`[DBG][meta-ads] Success on ${endpoint}, id=${data.id}`);
  return data;
}

async function metaApiGet(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<MetaInsightsResponse> {
  const token = getAccessToken();
  const searchParams = new URLSearchParams({
    ...params,
    access_token: token,
  });
  const url = `${META_API_BASE}${endpoint}?${searchParams.toString()}`;

  console.log(`[DBG][meta-ads] GET ${endpoint}`);

  const response = await fetch(url);
  const data = (await response.json()) as MetaInsightsResponse;

  if (!response.ok) {
    console.error(`[DBG][meta-ads] GET error on ${endpoint}:`, data);
    throw new Error(`Meta API GET error: ${response.status}`);
  }

  return data;
}

// ============================================
// Campaign Creation
// ============================================

export async function createMetaCampaign(params: {
  name: string;
  objective: string;
  lifetimeBudgetCents: number;
}): Promise<string> {
  const adAccountId = getAdAccountId();

  const result = await metaApiPost(`/act_${adAccountId}/campaigns`, {
    name: params.name,
    objective: params.objective,
    status: "PAUSED",
    special_ad_categories: "[]",
    lifetime_budget: String(params.lifetimeBudgetCents),
  });

  return result.id!;
}

export async function createMetaAdSet(params: {
  campaignId: string;
  name: string;
  targeting: AdTargeting;
  optimization_goal: string;
  startTime: string;
  endTime: string;
}): Promise<string> {
  const adAccountId = getAdAccountId();

  const targetingSpec: Record<string, unknown> = {
    age_min: params.targeting.ageMin,
    age_max: params.targeting.ageMax,
    geo_locations: {
      custom_locations: params.targeting.locations.map((loc) => ({
        key: loc.key,
      })),
    },
    flexible_spec:
      params.targeting.interests.length > 0
        ? [
            {
              interests: params.targeting.interests.map((i) => ({
                id: i.id,
                name: i.name,
              })),
            },
          ]
        : undefined,
  };

  if (
    params.targeting.genders.length > 0 &&
    !params.targeting.genders.includes(0)
  ) {
    targetingSpec.genders = params.targeting.genders;
  }

  const result = await metaApiPost(`/act_${adAccountId}/adsets`, {
    campaign_id: params.campaignId,
    name: params.name,
    targeting: JSON.stringify(targetingSpec),
    optimization_goal: params.optimization_goal,
    billing_event: "IMPRESSIONS",
    start_time: params.startTime,
    end_time: params.endTime,
    status: "PAUSED",
  });

  return result.id!;
}

export async function createMetaAdCreative(params: {
  name: string;
  creative: AdCreative;
}): Promise<string> {
  const adAccountId = getAdAccountId();
  const pageId = getPageId();

  const linkData: Record<string, string> = {
    link: params.creative.linkUrl,
    message: params.creative.primaryText,
    name: params.creative.headline,
    description: params.creative.description,
    call_to_action: JSON.stringify({
      type: params.creative.callToAction,
      value: { link: params.creative.linkUrl },
    }),
  };

  if (params.creative.imageUrl) {
    linkData.picture = params.creative.imageUrl;
  }

  const result = await metaApiPost(`/act_${adAccountId}/adcreatives`, {
    name: params.name,
    object_story_spec: JSON.stringify({
      page_id: pageId,
      link_data: linkData,
    }),
  });

  return result.id!;
}

export async function createMetaAd(params: {
  adSetId: string;
  creativeId: string;
  name: string;
}): Promise<string> {
  const adAccountId = getAdAccountId();

  const result = await metaApiPost(`/act_${adAccountId}/ads`, {
    adset_id: params.adSetId,
    creative: JSON.stringify({ creative_id: params.creativeId }),
    name: params.name,
    status: "PAUSED",
  });

  return result.id!;
}

export async function createMetaLeadForm(params: {
  name: string;
  questions: Array<{ type: string; label?: string }>;
}): Promise<string> {
  const pageId = getPageId();

  const result = await metaApiPost(`/${pageId}/leadgen_forms`, {
    name: params.name,
    questions: JSON.stringify(params.questions),
    privacy_policy: JSON.stringify({
      url: "https://callygo.com/privacy",
    }),
  });

  return result.id!;
}

// ============================================
// Campaign Management
// ============================================

export async function updateMetaCampaignStatus(
  campaignId: string,
  status: "ACTIVE" | "PAUSED" | "DELETED",
): Promise<void> {
  console.log(
    `[DBG][meta-ads] Updating campaign ${campaignId} status to ${status}`,
  );

  await metaApiPost(`/${campaignId}`, { status });
}

export async function updateMetaAdSetStatus(
  adSetId: string,
  status: "ACTIVE" | "PAUSED",
): Promise<void> {
  await metaApiPost(`/${adSetId}`, { status });
}

export async function updateMetaAdStatus(
  adId: string,
  status: "ACTIVE" | "PAUSED",
): Promise<void> {
  await metaApiPost(`/${adId}`, { status });
}

// ============================================
// Insights & Metrics
// ============================================

export async function getMetaCampaignInsights(
  campaignId: string,
): Promise<AdMetrics> {
  console.log(`[DBG][meta-ads] Fetching insights for campaign ${campaignId}`);

  const data = await metaApiGet(`/${campaignId}/insights`, {
    fields: "impressions,reach,clicks,ctr,cpc,spend,actions",
    date_preset: "lifetime",
  });

  const row = data.data?.[0];
  if (!row) {
    return {
      impressions: 0,
      reach: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      spendCents: 0,
      leads: 0,
      costPerLeadCents: 0,
    };
  }

  const leads =
    row.actions?.find((a) => a.action_type === "lead")?.value ?? "0";
  const spendCents = Math.round(parseFloat(row.spend || "0") * 100);
  const leadCount = parseInt(leads, 10);

  return {
    impressions: parseInt(row.impressions || "0", 10),
    reach: parseInt(row.reach || "0", 10),
    clicks: parseInt(row.clicks || "0", 10),
    ctr: parseFloat(row.ctr || "0"),
    cpc: parseFloat(row.cpc || "0"),
    spendCents,
    leads: leadCount,
    costPerLeadCents: leadCount > 0 ? Math.round(spendCents / leadCount) : 0,
  };
}

// ============================================
// Targeting Search
// ============================================

interface MetaSearchResult {
  data?: Array<{
    id: string;
    name: string;
    type?: string;
    audience_size_lower_bound?: number;
    audience_size_upper_bound?: number;
    country_code?: string;
    region?: string;
  }>;
}

export async function searchMetaInterests(
  query: string,
): Promise<Array<{ id: string; name: string }>> {
  console.log(`[DBG][meta-ads] Searching interests for: ${query}`);
  const token = getAccessToken();

  const url = `${META_API_BASE}/search?type=adinterest&q=${encodeURIComponent(query)}&access_token=${token}`;
  const response = await fetch(url);
  const data = (await response.json()) as MetaSearchResult;

  return (data.data || []).map((item) => ({
    id: item.id,
    name: item.name,
  }));
}

export async function searchMetaLocations(
  query: string,
): Promise<Array<{ key: string; name: string; type: string }>> {
  console.log(`[DBG][meta-ads] Searching locations for: ${query}`);
  const token = getAccessToken();

  const url = `${META_API_BASE}/search?type=adgeolocation&q=${encodeURIComponent(query)}&location_types=["city","region","country"]&access_token=${token}`;
  const response = await fetch(url);
  const data = (await response.json()) as MetaSearchResult;

  return (data.data || []).map((item) => ({
    key: item.id,
    name: item.name,
    type: item.type || "unknown",
  }));
}

// ============================================
// Full Campaign Submission Orchestrator
// ============================================

export async function submitCampaignToMeta(
  campaign: AdCampaign,
  landingPageUrl: string,
): Promise<{
  metaCampaignId: string;
  metaAdSetId: string;
  metaAdId: string;
  metaCreativeId: string;
  metaLeadFormId?: string;
}> {
  console.log(`[DBG][meta-ads] Submitting campaign ${campaign.id} to Meta`);

  const objective =
    campaign.goal === "lead_generation" ? "OUTCOME_LEADS" : "OUTCOME_TRAFFIC";
  const optimizationGoal =
    campaign.goal === "lead_generation" ? "LEAD_GENERATION" : "LINK_CLICKS";

  // 1. Create Campaign
  const metaCampaignId = await createMetaCampaign({
    name: campaign.name,
    objective,
    lifetimeBudgetCents: campaign.budgetCents,
  });

  // 2. Create lead form if lead gen
  let metaLeadFormId: string | undefined;
  if (campaign.goal === "lead_generation") {
    metaLeadFormId = await createMetaLeadForm({
      name: `${campaign.name} - Lead Form`,
      questions: [
        { type: "FULL_NAME" },
        { type: "EMAIL" },
        { type: "PHONE_NUMBER" },
      ],
    });
  }

  // 3. Create Ad Set
  const now = new Date();
  const endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const metaAdSetId = await createMetaAdSet({
    campaignId: metaCampaignId,
    name: `${campaign.name} - Ad Set`,
    targeting: campaign.targeting,
    optimization_goal: optimizationGoal,
    startTime: now.toISOString(),
    endTime: endDate.toISOString(),
  });

  // 4. Create Ad Creative
  const creative = { ...campaign.creative, linkUrl: landingPageUrl };
  const metaCreativeId = await createMetaAdCreative({
    name: `${campaign.name} - Creative`,
    creative,
  });

  // 5. Create Ad
  const metaAdId = await createMetaAd({
    adSetId: metaAdSetId,
    creativeId: metaCreativeId,
    name: `${campaign.name} - Ad`,
  });

  // 6. Activate everything
  await updateMetaAdStatus(metaAdId, "ACTIVE");
  await updateMetaAdSetStatus(metaAdSetId, "ACTIVE");
  await updateMetaCampaignStatus(metaCampaignId, "ACTIVE");

  console.log(`[DBG][meta-ads] Campaign ${campaign.id} submitted successfully`);

  return {
    metaCampaignId,
    metaAdSetId,
    metaAdId,
    metaCreativeId,
    metaLeadFormId,
  };
}
