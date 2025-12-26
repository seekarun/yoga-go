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

interface FormatContentRequest {
  content: string; // HTML content from TipTap editor
}

/**
 * POST /api/ai/format-blog-content
 * Fixes spelling and grammatical errors in blog content while preserving HTML structure
 */
export async function POST(request: Request) {
  console.log('[DBG][format-blog-content] Received request');

  try {
    const body: FormatContentRequest = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    console.log('[DBG][format-blog-content] Content length:', content.length);

    const prompt = `You are a professional editor. Fix spelling mistakes and grammatical errors in the following HTML content.

IMPORTANT RULES:
1. ONLY fix obvious spelling mistakes and grammatical errors
2. DO NOT change the meaning, tone, or style of the writing
3. DO NOT add or remove content
4. DO NOT change the HTML structure or tags
5. Preserve all HTML tags exactly as they are (<p>, <strong>, <em>, <h1>, <h2>, <ul>, <li>, <a>, <img>, etc.)
6. Keep the author's voice and writing style intact
7. If the content is already correct, return it unchanged

INPUT HTML:
${content}

Return ONLY the corrected HTML content, nothing else. No explanations, no markdown code blocks.`;

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a professional editor that fixes spelling and grammar while preserving HTML structure. Return only the corrected HTML.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.1, // Low temperature for consistent corrections
      max_tokens: 4000,
    });

    const formattedContent = completion.choices[0]?.message?.content?.trim();
    console.log('[DBG][format-blog-content] Formatted content length:', formattedContent?.length);

    if (!formattedContent) {
      throw new Error('Empty response from OpenAI');
    }

    // Remove any accidental markdown code blocks
    const cleanContent = formattedContent.replace(/```html\n?|\n?```/g, '').trim();

    return NextResponse.json({
      success: true,
      data: { content: cleanContent },
    });
  } catch (error) {
    console.error('[DBG][format-blog-content] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to format content',
      },
      { status: 500 }
    );
  }
}
