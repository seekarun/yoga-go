/**
 * POST /api/data/tenants/[tenantId]/surveys/[surveyId]/classify
 *
 * Public AI classify endpoint — given visitor info and classifier options,
 * uses AI to determine which option best matches the visitor's properties.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createChatCompletion, generateMessageId } from "@/lib/openai";
import { checkSpamProtection } from "@core/lib";
import { Tables } from "@/lib/dynamodb";
import type { VisitorInfo } from "@core/types";

interface ClassifyRequest {
  visitorInfo: VisitorInfo;
  options: { id: string; label: string }[];
  _hp?: string;
  _ts?: number;
}

interface RouteParams {
  params: Promise<{
    tenantId: string;
    surveyId: string;
  }>;
}

function letterFromIndex(i: number): string {
  return String.fromCharCode(97 + i); // a, b, c, ...
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { tenantId, surveyId } = await params;
  console.log(
    `[DBG][survey-classify] POST classify for tenant=${tenantId} survey=${surveyId}`,
  );

  try {
    // Spam protection
    const body = (await request.json()) as ClassifyRequest & {
      _hp?: string;
      _ts?: number;
    };
    const spamResult = await checkSpamProtection(
      request.headers,
      body as unknown as Record<string, unknown>,
      {
        tableName: Tables.CORE,
        maxRequests: 20,
        windowMinutes: 15,
        minSubmitSeconds: 1,
      },
    );
    if (!spamResult.passed) {
      console.log(
        `[DBG][survey-classify] Spam check failed: ${spamResult.reason}`,
      );
      return NextResponse.json(
        { success: false, error: "Request blocked" },
        { status: 429 },
      );
    }

    const { visitorInfo, options } = body;

    if (!visitorInfo || !options || options.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Build visitor properties JSON (exclude empty values)
    const visitorProps: Record<string, string> = {};
    for (const [key, val] of Object.entries(visitorInfo)) {
      if (val) visitorProps[key] = String(val);
    }

    const noneLetterIdx = options.length;
    const noneLetter = letterFromIndex(noneLetterIdx);

    const optionLines = options
      .map((o, i) => `${letterFromIndex(i)}. ${o.label}`)
      .join("\n");

    const systemPrompt = `You are classifying a website visitor into the best matching route condition.

Given the following visitor properties:
${JSON.stringify(visitorProps, null, 2)}

Which of the following conditions best matches this visitor?
${optionLines}
${noneLetter}. None of the above

Rules:
- Evaluate each condition against ALL available visitor properties (country, region, city, timezone, device type, browser, OS, language, referrer, etc.).
- Choose the most specific match. If multiple conditions could apply, pick the one that matches the most visitor attributes.
- Only choose "None of the above" if no condition specifically matches the visitor properties.
- Respond with ONLY the letter (e.g. "a") and nothing else.`;

    console.log("[DBG][survey-classify] Calling AI with visitor props");

    const result = await createChatCompletion(
      [
        {
          id: generateMessageId(),
          role: "user",
          content: "Classify this visitor.",
          timestamp: new Date().toISOString(),
        },
      ],
      systemPrompt,
    );

    const responseLetter = result.content.trim().toLowerCase().charAt(0);
    console.log("[DBG][survey-classify] AI response letter:", responseLetter);

    // Map letter back to option ID (null = no match → fallback branch)
    const idx = responseLetter.charCodeAt(0) - 97;
    const optionId = idx >= 0 && idx < options.length ? options[idx].id : null;

    console.log("[DBG][survey-classify] Mapped to optionId:", optionId);

    return NextResponse.json({
      success: true,
      data: { optionId },
    });
  } catch (error) {
    console.error("[DBG][survey-classify] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to classify visitor" },
      { status: 500 },
    );
  }
}
