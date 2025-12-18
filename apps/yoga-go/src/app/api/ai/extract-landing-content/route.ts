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
  howYouHelp: string; // How can you help your students?
  valuesForLearners: string; // What values can learners expect to gain?
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
    const { expertName, howYouHelp, valuesForLearners, aboutBio } = body;

    console.log('[DBG][extract-landing-content] Processing for:', expertName);

    if (!howYouHelp && !valuesForLearners && !aboutBio) {
      return NextResponse.json(
        { success: false, error: 'At least one content field is required' },
        { status: 400 }
      );
    }

    const prompt = `You are a landing page copywriter for yoga and wellness experts. Extract content from user inputs into structured landing page sections.

Expert Name: ${expertName}

INPUT 1 - How they help students (use this for HERO SECTION):
${howYouHelp || 'Not provided'}

INPUT 2 - Values learners can expect (use this for VALUE PROPOSITIONS):
${valuesForLearners || 'Not provided'}

Based on the above, generate a JSON response with the following structure:

{
  "hero": {
    "headline": "Extract a problem-hook headline (max 8 words) from INPUT 1. This should address the student's pain point or struggle.",
    "description": "Extract a results-hook (1-2 sentences) from INPUT 1. This should describe the transformation or outcome students will achieve.",
    "ctaText": "Start Your Journey"
  },
  "valuePropositions": {
    "type": "list",
    "items": ["Value 1 from INPUT 2", "Value 2 from INPUT 2"]
  }
}

IMPORTANT RULES:
1. For HERO - Extract ONLY from INPUT 1:
   - headline: Identify the main problem/struggle mentioned and turn it into a question or statement (e.g., "Struggling with stress and back pain?")
   - description: Identify the solution/transformation offered (e.g., "Find peace and balance through simple yoga practices")

2. For VALUE PROPOSITIONS - Extract ONLY from INPUT 2:
   - Extract exactly 2 clear, concise benefits
   - Keep them short (5-10 words each)
   - Focus on outcomes, not features

3. Keep the expert's authentic voice - don't over-polish
4. If input is not provided, use empty string ""

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
