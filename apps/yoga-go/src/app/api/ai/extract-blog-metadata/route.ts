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

interface ExtractBlogMetadataRequest {
  title: string;
  content: string; // HTML content from TipTap editor
}

interface ExtractedBlogMetadata {
  excerpt: string;
  tags: string[];
}

/**
 * POST /api/ai/extract-blog-metadata
 * Extracts excerpt and tags from blog post content using OpenAI
 */
export async function POST(request: Request) {
  console.log('[DBG][extract-blog-metadata] Received request');

  try {
    const body: ExtractBlogMetadataRequest = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Strip HTML tags to get plain text for analysis
    const plainTextContent = content
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(
      '[DBG][extract-blog-metadata] Processing blog:',
      title,
      'Content length:',
      plainTextContent.length
    );

    const prompt = `You are a blog content analyst for a yoga and wellness platform. Analyze the following blog post and extract metadata.

BLOG POST TITLE: ${title}

BLOG POST CONTENT:
${plainTextContent.substring(0, 3000)}

Generate a JSON response with:
1. "excerpt": A compelling 1-2 sentence summary (max 160 characters) that captures the essence of the post and entices readers to click. Write in the same voice/tone as the content.
2. "tags": An array of 3-5 relevant lowercase tags that categorize the content. Use common yoga/wellness topics when applicable (e.g., "meditation", "flexibility", "stress-relief", "beginners", "breathing", "mindfulness", "yoga-poses", "wellness", "self-care").

{
  "excerpt": "Your excerpt here...",
  "tags": ["tag1", "tag2", "tag3"]
}

RULES:
1. Excerpt should be engaging and informative, not just a truncation
2. Tags should be lowercase, hyphenated for multi-word (e.g., "stress-relief")
3. Choose tags that help with discoverability
4. Return ONLY the JSON object, no markdown formatting`;

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that extracts blog metadata. Always respond with valid JSON only.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content?.trim();
    console.log('[DBG][extract-blog-metadata] OpenAI response:', responseText);

    if (!responseText) {
      throw new Error('Empty response from OpenAI');
    }

    // Parse JSON response
    let extractedMetadata: ExtractedBlogMetadata;
    try {
      // Remove any markdown code blocks if present
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      extractedMetadata = JSON.parse(cleanJson);

      // Validate and sanitize
      if (!extractedMetadata.excerpt || typeof extractedMetadata.excerpt !== 'string') {
        extractedMetadata.excerpt = plainTextContent.substring(0, 160) + '...';
      }
      if (!Array.isArray(extractedMetadata.tags)) {
        extractedMetadata.tags = [];
      }
      // Ensure tags are lowercase and limited
      extractedMetadata.tags = extractedMetadata.tags
        .slice(0, 5)
        .map((tag: string) => tag.toLowerCase().trim());
    } catch (parseError) {
      console.error('[DBG][extract-blog-metadata] Failed to parse JSON:', parseError);
      // Fallback: create basic metadata
      extractedMetadata = {
        excerpt: plainTextContent.substring(0, 160) + '...',
        tags: [],
      };
    }

    console.log('[DBG][extract-blog-metadata] Extracted metadata:', extractedMetadata);

    return NextResponse.json({
      success: true,
      data: extractedMetadata,
    });
  } catch (error) {
    console.error('[DBG][extract-blog-metadata] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract metadata',
      },
      { status: 500 }
    );
  }
}
