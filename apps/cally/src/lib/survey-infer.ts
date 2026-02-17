/**
 * Client-side helper to classify a survey text answer via AI inference.
 * Calls the authenticated /api/data/app/surveys/infer endpoint.
 */

export async function inferSurveyAnswer(
  question: string,
  answer: string,
  options: { id: string; label: string }[],
): Promise<string | null> {
  const res = await fetch("/api/data/app/surveys/infer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer, options }),
  });
  const data = await res.json();
  return data.data?.optionId ?? null;
}
