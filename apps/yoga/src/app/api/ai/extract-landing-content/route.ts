import { NextResponse } from 'next/server';
import OpenAI from 'openai';

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

interface ExtractContentRequest {
  expertName: string;
  teachingPlan: string; // What do you plan to teach?
  aboutBio: string; // About/promo text
}

interface ExtractedContent {
  hero: {
    headline: string;
    description: string;
    ctaText: string;
  };
  valuePropositions: {
    type: 'list';
    items: string[];
  };
}

export async function POST(request: Request) {
  console.log('[DBG][extract-landing-content] Received request');

  try {
    const body: ExtractContentRequest = await request.json();
    const { expertName, teachingPlan, aboutBio } = body;

    console.log('[DBG][extract-landing-content] Processing for:', expertName);

    if (!teachingPlan && !aboutBio) {
      return NextResponse.json(
        { success: false, error: 'At least one content field is required' },
        { status: 400 }
      );
    }

    const prompt = `You are a landing page copywriter for yoga and wellness experts. Extract content from the user's teaching plan into structured landing page sections.

Expert Name: ${expertName}

TEACHING PLAN (what they plan to teach):
${teachingPlan || 'Not provided'}

From this single input, extract BOTH the hero section AND value propositions. Generate a JSON response:

{
  "hero": {
    "headline": "A problem-hook headline (max 8 words) addressing the student's pain point or struggle",
    "description": "A results-hook (1-2 sentences) describing the transformation or outcome students will achieve",
    "ctaText": "Start Your Journey"
  },
  "valuePropositions": {
    "type": "list",
    "items": ["Benefit 1", "Benefit 2"]
  }
}

EXTRACTION RULES:
1. For HERO:
   - headline: Find the problem/struggle mentioned (e.g., "Struggling with stress and back pain?")
   - description: Find the solution/transformation offered (e.g., "Find peace and balance through simple yoga practices")

2. For VALUE PROPOSITIONS:
   - Extract exactly 2 clear, concise benefits or outcomes
   - Keep them short (5-10 words each)
   - Focus on results students will achieve

3. Keep the expert's authentic voice - don't over-polish
4. If teaching plan is not provided, use empty strings

Return ONLY the JSON object, no markdown formatting.`;

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts and enhances landing page content. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    console.log('[DBG][extract-landing-content] OpenAI response:', responseText);

    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    let extractedContent: ExtractedContent;
    try {
      // Remove any markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      extractedContent = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('[DBG][extract-landing-content] Failed to parse JSON:', parseError);
      throw new Error('Failed to parse AI response');
    }

    console.log('[DBG][extract-landing-content] Extracted content:', extractedContent);

    return NextResponse.json({
      success: true,
      data: extractedContent,
    });
  } catch (error) {
    console.error('[DBG][extract-landing-content] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract content',
      },
      { status: 500 }
    );
  }
}
