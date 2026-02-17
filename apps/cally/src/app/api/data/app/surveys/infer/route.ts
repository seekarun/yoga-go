/**
 * POST /api/data/app/surveys/infer — classify a text answer against inference options
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createChatCompletion } from "@/lib/openai";
import { generateMessageId } from "@/lib/openai";

interface InferRequest {
  question: string;
  answer: string;
  options: { id: string; label: string }[];
}

interface InferResponse {
  optionId: string | null;
}

function letterFromIndex(i: number): string {
  return String.fromCharCode(97 + i); // a, b, c, ...
}

export async function POST(req: NextRequest) {
  console.log("[DBG][survey-infer] POST called");

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await req.json()) as InferRequest;
    const { question, answer, options } = body;

    if (!question || !answer || !options || options.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 },
      );
    }

    const noneLetterIdx = options.length;
    const noneLetter = letterFromIndex(noneLetterIdx);

    const optionLines = options
      .map((o, i) => `${letterFromIndex(i)}. ${o.label}`)
      .join("\n");

    const systemPrompt = `You are classifying a survey response into the most relevant category.

A survey asked the following question:
"${question}"

The respondent answered:
"${answer}"

Which of the following categories best describes the respondent's answer?
${optionLines}
${noneLetter}. None of the above

Rules:
- Choose the single best match based on the meaning and intent of the answer.
- If the answer is ambiguous but leans toward one category, choose that category.
- Only choose "None of the above" if the answer is completely unrelated to all categories.
- Respond with ONLY the letter (e.g. "a") and nothing else.`;

    console.log(
      "[DBG][survey-infer] Classifying answer for question:",
      question,
    );

    const result = await createChatCompletion(
      [
        {
          id: generateMessageId(),
          role: "user",
          content: `Classify: "${answer}"`,
          timestamp: new Date().toISOString(),
        },
      ],
      systemPrompt,
    );

    const responseLetter = result.content.trim().toLowerCase().charAt(0);
    console.log("[DBG][survey-infer] AI response letter:", responseLetter);

    // Map letter back to option ID
    let optionId: string | null = null;
    if (responseLetter !== noneLetter) {
      const idx = responseLetter.charCodeAt(0) - 97;
      if (idx >= 0 && idx < options.length) {
        optionId = options[idx].id;
      }
    }

    console.log("[DBG][survey-infer] Mapped to optionId:", optionId);

    return NextResponse.json<{ success: true; data: InferResponse }>({
      success: true,
      data: { optionId },
    });
  } catch (error) {
    console.error("[DBG][survey-infer] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to classify response" },
      { status: 500 },
    );
  }
}
