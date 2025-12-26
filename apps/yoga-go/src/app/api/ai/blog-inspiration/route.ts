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

const SYSTEM_PROMPT = `You are a content creator who helps yoga instructors with generating content for their blog.

You are friendly, encouraging, and knowledgeable about yoga, wellness, mindfulness, and holistic health. Help the instructor brainstorm ideas, refine their thoughts, and develop engaging content that resonates with their audience.

When chatting:
- Ask thoughtful questions to understand their teaching style and audience
- Suggest topics, angles, and hooks for blog posts
- Help them articulate their unique perspective
- Offer tips on making content engaging and authentic

When asked to summarize as a blog post:
- Create a well-structured blog post with a compelling title
- Include an engaging introduction that hooks readers
- Use clear headings and subheadings
- Write in the instructor's voice based on the conversation
- End with a meaningful conclusion or call-to-action
- Format the content in HTML suitable for a blog (use <h2>, <p>, <ul>, <li>, <strong>, <em> tags)`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  generateBlogPost?: boolean;
}

/**
 * POST /api/ai/blog-inspiration
 * Chat with AI for blog inspiration, optionally generate a blog post from conversation
 */
export async function POST(request: Request) {
  console.log('[DBG][blog-inspiration] Received request');

  try {
    const body: ChatRequest = await request.json();
    const { messages, generateBlogPost } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ success: false, error: 'Messages are required' }, { status: 400 });
    }

    console.log(
      '[DBG][blog-inspiration] Processing',
      messages.length,
      'messages, generateBlogPost:',
      generateBlogPost
    );

    // Build the messages array for OpenAI
    const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    // If generating blog post, add instruction
    if (generateBlogPost) {
      openaiMessages.push({
        role: 'user',
        content:
          'Based on our conversation, please create a complete blog post. Format it in HTML with proper headings (<h2>), paragraphs (<p>), and lists where appropriate. Start with a compelling title wrapped in <h1> tags, then the full blog content. Make it engaging and authentic to my voice.',
      });
    }

    const client = getOpenAIClient();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: openaiMessages,
      temperature: 0.7,
      max_tokens: generateBlogPost ? 2000 : 1000,
    });

    const responseContent = completion.choices[0]?.message?.content?.trim();
    console.log('[DBG][blog-inspiration] Response length:', responseContent?.length);

    if (!responseContent) {
      throw new Error('Empty response from OpenAI');
    }

    // If generating blog post, extract title and content
    if (generateBlogPost) {
      // Try to extract title from <h1> tag
      const titleMatch = responseContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'Untitled Post';

      // Remove the h1 tag from content (we'll use title separately)
      const content = responseContent.replace(/<h1[^>]*>.*?<\/h1>/i, '').trim();

      return NextResponse.json({
        success: true,
        data: {
          blogPost: {
            title,
            content,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        message: responseContent,
      },
    });
  } catch (error) {
    console.error('[DBG][blog-inspiration] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request',
      },
      { status: 500 }
    );
  }
}
