/**
 * AI-powered campaign generation using OpenAI API
 *
 * Generates targeting suggestions and ad creatives for boost campaigns
 * based on the expert's profile, courses, and campaign goal.
 */

import OpenAI from 'openai';
import type { BoostGoal, BoostTargeting, BoostCreative, Expert, Course } from '@/types';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

interface GenerateCampaignInput {
  expert: {
    name: string;
    bio?: string;
    specializations?: string[];
    location?: string;
  };
  course?: {
    title: string;
    description?: string;
    level?: string;
    price?: number;
    currency?: string;
  };
  goal: BoostGoal;
  budget: number; // in cents
  currency: string;
}

interface GenerateCampaignResult {
  targeting: BoostTargeting;
  creative: BoostCreative;
  alternativeCreatives: BoostCreative[];
  reasoning: string;
}

/**
 * Generate a complete ad campaign using Claude AI
 */
export async function generateCampaign(
  input: GenerateCampaignInput
): Promise<GenerateCampaignResult> {
  console.log('[DBG][boost-ai] Generating campaign for goal:', input.goal);

  const goalDescription = getGoalDescription(input.goal);
  const budgetFormatted = formatBudget(input.budget, input.currency);

  const prompt = buildPrompt(input, goalDescription, budgetFormatted);

  try {
    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert digital marketing strategist. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    const result = parseResponse(responseText);
    console.log('[DBG][boost-ai] Campaign generated successfully');

    return result;
  } catch (error) {
    console.error('[DBG][boost-ai] Error generating campaign:', error);
    throw new Error(
      `Failed to generate campaign: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function getGoalDescription(goal: BoostGoal): string {
  switch (goal) {
    case 'get_students':
      return 'Get more students enrolled in courses';
    case 'promote_course':
      return 'Promote a specific course and drive enrollments';
    case 'brand_awareness':
      return 'Increase brand awareness and visibility';
  }
}

function formatBudget(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  });
  return formatter.format(amount / 100);
}

function buildPrompt(
  input: GenerateCampaignInput,
  goalDescription: string,
  budgetFormatted: string
): string {
  let courseInfo = '';
  if (input.course) {
    courseInfo = `
## Course to Promote
- Title: ${input.course.title}
- Description: ${input.course.description || 'Not provided'}
- Level: ${input.course.level || 'All levels'}
- Price: ${input.course.price ? formatBudget(input.course.price * 100, input.course.currency || 'USD') : 'Not specified'}
`;
  }

  return `You are an expert digital marketing strategist specializing in Meta Ads (Facebook/Instagram) for yoga and wellness businesses.

## Task
Create a targeted ad campaign for a yoga instructor. Generate audience targeting and 3 creative variations.

## Expert Profile
- Name: ${input.expert.name}
- Bio: ${input.expert.bio || 'Not provided'}
- Specializations: ${input.expert.specializations?.join(', ') || 'General yoga'}
- Location: ${input.expert.location || 'Global'}
${courseInfo}
## Campaign Goal
${goalDescription}

## Budget
${budgetFormatted}

## Requirements
Generate a JSON response with:
1. targeting: Audience targeting for Meta Ads
2. creative: Primary ad creative
3. alternativeCreatives: 2 alternative ad creatives
4. reasoning: Brief explanation of your strategy

## Response Format (JSON only, no markdown)
{
  "targeting": {
    "ageMin": <number 18-65>,
    "ageMax": <number 18-65>,
    "genders": ["male" | "female" | "all"],
    "locations": [<country codes or city names>],
    "interests": [<Meta interest keywords like "Yoga", "Meditation", "Fitness">]
  },
  "creative": {
    "headline": "<max 40 chars, attention-grabbing>",
    "primaryText": "<max 125 chars, compelling copy>",
    "description": "<max 30 chars, supporting text>",
    "callToAction": "Learn More" | "Sign Up" | "Book Now" | "Get Offer"
  },
  "alternativeCreatives": [
    { "headline": "...", "primaryText": "...", "description": "...", "callToAction": "..." },
    { "headline": "...", "primaryText": "...", "description": "...", "callToAction": "..." }
  ],
  "reasoning": "<1-2 sentences explaining the strategy>"
}

Respond ONLY with the JSON object, no additional text or formatting.`;
}

function parseResponse(text: string): GenerateCampaignResult {
  // Clean the response - remove any markdown code blocks if present
  let cleanedText = text.trim();
  if (cleanedText.startsWith('```')) {
    cleanedText = cleanedText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(cleanedText);

    // Validate required fields
    if (!parsed.targeting || !parsed.creative || !parsed.alternativeCreatives) {
      throw new Error('Missing required fields in response');
    }

    // Validate and normalize targeting
    const targeting: BoostTargeting = {
      ageMin: Math.max(18, Math.min(65, parsed.targeting.ageMin || 25)),
      ageMax: Math.max(18, Math.min(65, parsed.targeting.ageMax || 55)),
      genders: parsed.targeting.genders || ['all'],
      locations: parsed.targeting.locations || [],
      interests: parsed.targeting.interests || [],
    };

    // Validate and normalize creative
    const creative: BoostCreative = normalizeCreative(parsed.creative);

    // Validate alternative creatives
    const alternativeCreatives: BoostCreative[] = (parsed.alternativeCreatives || [])
      .slice(0, 2)
      .map(normalizeCreative);

    return {
      targeting,
      creative,
      alternativeCreatives,
      reasoning: parsed.reasoning || 'AI-generated campaign targeting yoga enthusiasts.',
    };
  } catch (parseError) {
    console.error('[DBG][boost-ai] Failed to parse response:', parseError);
    console.error('[DBG][boost-ai] Response text:', text);

    // Return fallback defaults
    return getDefaultCampaign();
  }
}

function normalizeCreative(raw: Record<string, unknown>): BoostCreative {
  return {
    headline: truncate(String(raw.headline || 'Transform Your Practice'), 40),
    primaryText: truncate(String(raw.primaryText || 'Join our yoga journey today.'), 125),
    description: truncate(String(raw.description || 'Expert-led classes'), 30),
    callToAction: String(raw.callToAction || 'Learn More'),
  };
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

function getDefaultCampaign(): GenerateCampaignResult {
  return {
    targeting: {
      ageMin: 25,
      ageMax: 55,
      genders: ['all'],
      locations: ['US', 'IN', 'UK', 'AU'],
      interests: ['Yoga', 'Meditation', 'Wellness', 'Fitness', 'Health'],
    },
    creative: {
      headline: 'Start Your Yoga Journey',
      primaryText:
        'Expert-led yoga classes designed for all levels. Join thousands of students today.',
      description: 'Classes for all levels',
      callToAction: 'Learn More',
    },
    alternativeCreatives: [
      {
        headline: 'Find Your Balance',
        primaryText: 'Transform your body and mind with authentic yoga instruction.',
        description: 'Start your journey',
        callToAction: 'Sign Up',
      },
      {
        headline: 'Yoga Made Simple',
        primaryText: 'Learn yoga at your own pace with professional guidance.',
        description: 'Expert instructors',
        callToAction: 'Get Offer',
      },
    ],
    reasoning: 'Targeting health-conscious adults interested in yoga and wellness.',
  };
}

/**
 * Generate campaign from expert and course data
 * Helper function to transform database entities to AI input
 */
export async function generateCampaignFromExpert(
  expert: Expert,
  course: Course | null,
  goal: BoostGoal,
  budget: number,
  currency: string
): Promise<GenerateCampaignResult> {
  return generateCampaign({
    expert: {
      name: expert.name,
      bio: expert.bio,
      specializations: expert.specializations,
    },
    course: course
      ? {
          title: course.title,
          description: course.description,
          level: course.level,
          price: course.price,
          currency: currency,
        }
      : undefined,
    goal,
    budget,
    currency,
  });
}
