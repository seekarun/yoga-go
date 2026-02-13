/**
 * AI-Powered Ad Campaign Generation for CallyGo
 * Uses OpenAI to generate targeting and creative for Facebook/Instagram ads
 * Pattern matches openai.ts (raw fetch, JSON mode)
 */

import type {
  AdCampaignGenerationInput,
  AdCampaignGenerationOutput,
} from "@/types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return apiKey;
}

function getModel(): string {
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

interface OpenAIResponse {
  choices: Array<{
    message: { content: string };
  }>;
  usage: {
    total_tokens: number;
  };
}

const CAMPAIGN_GENERATION_PROMPT = `You are an expert Facebook/Instagram ad campaign strategist. Generate a complete ad campaign based on the business information provided.

Return a JSON object with this exact structure:
{
  "name": "Short campaign name (max 50 chars)",
  "targeting": {
    "locations": [{"key": "city_key", "name": "City Name", "type": "city"}],
    "ageMin": 25,
    "ageMax": 55,
    "genders": [0],
    "interests": [{"id": "interest_id", "name": "Interest Name"}]
  },
  "creative": {
    "headline": "Compelling headline (max 40 chars)",
    "primaryText": "Engaging primary text (max 125 chars)",
    "description": "Supporting description that encourages action",
    "callToAction": "LEARN_MORE",
    "linkUrl": "{{landingPageUrl}}"
  }
}

Guidelines:
- For targeting locations, use the business location if provided, otherwise suggest broad targeting
- For interests, suggest 3-5 relevant interests based on the business type
- Age range should match the likely customer demographic
- genders: [0] = all, [1] = male, [2] = female
- callToAction options: LEARN_MORE, BOOK_TRAVEL (for bookings), SIGN_UP, CONTACT_US, GET_QUOTE
- For lead_generation goal, use SIGN_UP or GET_QUOTE as CTA
- For traffic goal, use LEARN_MORE or BOOK_TRAVEL as CTA
- headline must be under 40 characters
- primaryText must be under 125 characters
- Make the copy compelling, benefit-focused, and action-oriented
- Use the business name and services to make ads specific and relevant`;

/**
 * Generate a complete ad campaign using AI
 */
export async function generateAdCampaign(
  input: AdCampaignGenerationInput,
): Promise<AdCampaignGenerationOutput> {
  console.log(
    `[DBG][ad-campaign-ai] Generating campaign for ${input.businessName}`,
  );

  const apiKey = getApiKey();
  const model = getModel();

  const userMessage = `Generate a Facebook/Instagram ad campaign for this business:

Business Name: ${input.businessName}
${input.businessDescription ? `Description: ${input.businessDescription}` : ""}
${input.services ? `Services: ${input.services}` : ""}
${input.location ? `Location: ${input.location}` : ""}
Landing Page URL: ${input.landingPageUrl}

Campaign Goal: ${input.goal === "lead_generation" ? "Lead Generation (collect contact info)" : "Traffic (drive visitors to landing page)"}
Platform: ${input.platform}
Budget: $${input.bundleId === "bundle_50" ? "40" : input.bundleId === "bundle_100" ? "80" : "160"} ad spend`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: CAMPAIGN_GENERATION_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[DBG][ad-campaign-ai] API error:",
      response.status,
      errorText,
    );
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from OpenAI");
  }

  const content = data.choices[0].message.content;
  console.log(
    "[DBG][ad-campaign-ai] Response received, tokens:",
    data.usage?.total_tokens,
  );

  const result = JSON.parse(content) as AdCampaignGenerationOutput;

  // Replace placeholder URL
  result.creative.linkUrl = input.landingPageUrl;

  // Enforce character limits
  if (result.creative.headline.length > 40) {
    result.creative.headline = result.creative.headline.substring(0, 40);
  }
  if (result.creative.primaryText.length > 125) {
    result.creative.primaryText = result.creative.primaryText.substring(0, 125);
  }

  return result;
}

/**
 * Regenerate ad creative with optional feedback
 */
export async function regenerateAdCreative(
  input: AdCampaignGenerationInput,
  previousCreative: AdCampaignGenerationOutput,
  feedback?: string,
): Promise<AdCampaignGenerationOutput> {
  console.log(
    `[DBG][ad-campaign-ai] Regenerating creative for ${input.businessName}`,
  );

  const apiKey = getApiKey();
  const model = getModel();

  const userMessage = `Regenerate the ad campaign creative for this business:

Business Name: ${input.businessName}
${input.businessDescription ? `Description: ${input.businessDescription}` : ""}
${input.services ? `Services: ${input.services}` : ""}
${input.location ? `Location: ${input.location}` : ""}
Landing Page URL: ${input.landingPageUrl}

Campaign Goal: ${input.goal === "lead_generation" ? "Lead Generation" : "Traffic"}
Platform: ${input.platform}

Previous creative that needs improvement:
- Headline: ${previousCreative.creative.headline}
- Primary Text: ${previousCreative.creative.primaryText}
- Description: ${previousCreative.creative.description}
- CTA: ${previousCreative.creative.callToAction}

${feedback ? `User feedback: ${feedback}` : "Generate a completely different angle and approach."}

Keep the same targeting but create fresh, different creative copy.`;

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: CAMPAIGN_GENERATION_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1000,
      temperature: 0.9,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[DBG][ad-campaign-ai] Regenerate API error:",
      response.status,
      errorText,
    );
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from OpenAI");
  }

  const content = data.choices[0].message.content;
  const result = JSON.parse(content) as AdCampaignGenerationOutput;

  result.creative.linkUrl = input.landingPageUrl;

  if (result.creative.headline.length > 40) {
    result.creative.headline = result.creative.headline.substring(0, 40);
  }
  if (result.creative.primaryText.length > 125) {
    result.creative.primaryText = result.creative.primaryText.substring(0, 125);
  }

  return result;
}
