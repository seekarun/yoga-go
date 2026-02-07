// @ts-nocheck — WIP: depends on LandingPageConfig V2 types not yet implemented
/**
 * OpenAI Integration for AI-Powered Landing Page Editing
 *
 * Uses structured outputs (function calling) to generate page sections
 * from natural language prompts.
 */

import type {
  LandingPageConfig,
  Section,
  SectionType,
} from "@/types/landing-page";
import type { BusinessInfo } from "@/types/ai-assistant";
import { SECTION_TYPES, generateSectionId } from "@/types/landing-page";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Response from AI landing page edit
 */
export interface AIEditResponse {
  /** New sections array to replace the current one */
  sections: Section[];
  /** Summary of changes made */
  summary: string;
  /** List of individual changes */
  changes: {
    type: "added" | "modified" | "removed" | "reordered";
    section: SectionType;
    field?: string;
  }[];
}

/**
 * Request to AI landing page edit endpoint
 */
export interface AIEditRequest {
  /** User's prompt describing desired changes */
  prompt: string;
  /** Current landing page configuration */
  currentConfig: LandingPageConfig;
  /** Optional business info for context */
  businessInfo?: BusinessInfo;
}

/**
 * Get OpenAI API key from environment
 */
function getApiKey(): string {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Build the system prompt for landing page editing
 */
function buildLandingPageSystemPrompt(businessInfo?: BusinessInfo): string {
  const sectionDescriptions = SECTION_TYPES.map(
    (s) => `- ${s.type}: ${s.description}`,
  ).join("\n");

  let businessContext = "";
  if (businessInfo) {
    const parts: string[] = [];
    if (businessInfo.businessName)
      parts.push(`Business: ${businessInfo.businessName}`);
    if (businessInfo.description)
      parts.push(`Description: ${businessInfo.description}`);
    if (businessInfo.services) parts.push(`Services: ${businessInfo.services}`);
    if (businessInfo.location) parts.push(`Location: ${businessInfo.location}`);
    if (businessInfo.contactInfo)
      parts.push(`Contact: ${businessInfo.contactInfo}`);
    if (parts.length > 0) {
      businessContext = `\n\nBUSINESS CONTEXT:\n${parts.join("\n")}`;
    }
  }

  return `You are a professional landing page designer and copywriter. Your job is to modify landing page sections based on user requests.

AVAILABLE SECTION TYPES:
${sectionDescriptions}
${businessContext}

GUIDELINES:
1. Generate realistic, professional placeholder text appropriate to the business
2. Keep existing content unless the user asks to change it
3. When adding testimonials, create 3-5 realistic examples
4. When adding FAQ, suggest 4-6 relevant questions
5. Use concise, professional copywriting
6. Maintain section order as specified or reorder if requested
7. Always include at least one hero section
8. Return the COMPLETE sections array (not a diff/patch)

IMPORTANT:
- Each section needs a unique "id" field (use format "section-{timestamp}-{random}")
- Each section needs an "order" field (0-indexed, lower = higher on page)
- The "type" field must match one of the available section types exactly
- For hero sections, include variant: "centered" | "left-aligned" | "split" | "minimal" | "bold"
- For button configs, use action: "booking" or "contact"

Respond with valid JSON only. No markdown, no explanations.`;
}

/**
 * Serialize current config for the prompt
 */
function serializeConfig(config: LandingPageConfig): string {
  return JSON.stringify(
    {
      template: config.template,
      sections: config.sections.map((s) => ({
        id: s.id,
        type: s.type,
        order: s.order,
        // Include key content fields based on type
        ...getSerializableContent(s),
      })),
    },
    null,
    2,
  );
}

/**
 * Get serializable content fields for a section
 */
function getSerializableContent(section: Section): Record<string, unknown> {
  switch (section.type) {
    case "hero":
      return {
        title: section.title,
        subtitle: section.subtitle,
        variant: section.variant,
        button: section.button,
      };
    case "about":
      return {
        heading: section.heading,
        paragraph: section.paragraph,
        layout: section.layout,
      };
    case "features":
      return {
        heading: section.heading,
        subheading: section.subheading,
        cards: section.cards.map((c) => ({
          title: c.title,
          description: c.description,
        })),
      };
    case "testimonials":
      return {
        heading: section.heading,
        subheading: section.subheading,
        testimonials: section.testimonials.map((t) => ({
          quote: t.quote,
          authorName: t.authorName,
          authorTitle: t.authorTitle,
          rating: t.rating,
        })),
      };
    case "faq":
      return {
        heading: section.heading,
        subheading: section.subheading,
        items: section.items.map((i) => ({
          question: i.question,
          answer: i.answer,
        })),
      };
    case "pricing":
      return {
        heading: section.heading,
        subheading: section.subheading,
        tiers: section.tiers.map((t) => ({
          name: t.name,
          price: t.price,
          period: t.period,
          features: t.features,
          highlighted: t.highlighted,
        })),
      };
    case "gallery":
      return {
        heading: section.heading,
        subheading: section.subheading,
        columns: section.columns,
      };
    case "team":
      return {
        heading: section.heading,
        subheading: section.subheading,
        members: section.members.map((m) => ({
          name: m.name,
          role: m.role,
          bio: m.bio,
        })),
      };
    case "contact":
      return {
        heading: section.heading,
        subheading: section.subheading,
        email: section.email,
        phone: section.phone,
        address: section.address,
        showForm: section.showForm,
      };
    case "cta":
      return {
        heading: section.heading,
        subheading: section.subheading,
        button: section.button,
      };
    case "custom":
      return {
        heading: section.heading,
        content: section.content,
      };
    default:
      return {};
  }
}

/**
 * Parse and validate AI response
 */
function parseAIResponse(responseText: string): AIEditResponse {
  // Try to extract JSON from the response
  let jsonStr = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(jsonStr);

  // Validate sections array exists
  if (!Array.isArray(parsed.sections)) {
    throw new Error("Invalid response: sections must be an array");
  }

  // Ensure each section has required fields and valid IDs
  const sections = parsed.sections.map(
    (s: Record<string, unknown>, index: number) => {
      // Ensure ID exists
      if (!s.id || typeof s.id !== "string") {
        s.id = generateSectionId();
      }
      // Ensure order exists
      if (typeof s.order !== "number") {
        s.order = index;
      }
      return s;
    },
  ) as Section[];

  return {
    sections,
    summary: parsed.summary || "Page updated",
    changes: parsed.changes || [{ type: "modified", section: "hero" }],
  };
}

/**
 * Generate landing page sections using OpenAI
 */
export async function generateLandingPageEdit(
  request: AIEditRequest,
): Promise<AIEditResponse> {
  console.log("[DBG][openai-landing-page] Generating AI edit");
  console.log("[DBG][openai-landing-page] Prompt:", request.prompt);

  const apiKey = getApiKey();
  const systemPrompt = buildLandingPageSystemPrompt(request.businessInfo);
  const serializedConfig = serializeConfig(request.currentConfig);

  const userMessage = `CURRENT PAGE CONFIGURATION:
${serializedConfig}

USER REQUEST:
${request.prompt}

Generate the updated sections array. Include all sections (not just changed ones). Respond with JSON in this format:
{
  "sections": [...array of section objects...],
  "summary": "Brief description of changes",
  "changes": [{"type": "added|modified|removed|reordered", "section": "sectionType"}]
}`;

  console.log("[DBG][openai-landing-page] Making API request");

  const response = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      max_tokens: 4000,
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      "[DBG][openai-landing-page] API error:",
      response.status,
      errorText,
    );
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  interface OpenAIResponse {
    choices: Array<{
      message: {
        content: string;
      };
    }>;
    usage?: {
      total_tokens: number;
    };
  }

  const data = (await response.json()) as OpenAIResponse;

  if (!data.choices || data.choices.length === 0) {
    console.error("[DBG][openai-landing-page] No choices in response");
    throw new Error("No response from OpenAI");
  }

  const content = data.choices[0].message.content;
  console.log(
    "[DBG][openai-landing-page] Response received, tokens:",
    data.usage?.total_tokens,
  );

  try {
    const result = parseAIResponse(content);
    console.log(
      "[DBG][openai-landing-page] Parsed response:",
      result.summary,
      "sections:",
      result.sections.length,
    );
    return result;
  } catch (parseError) {
    console.error("[DBG][openai-landing-page] Parse error:", parseError);
    console.error("[DBG][openai-landing-page] Raw content:", content);
    throw new Error("Failed to parse AI response");
  }
}
