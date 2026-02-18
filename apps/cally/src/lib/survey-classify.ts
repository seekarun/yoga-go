/**
 * Client helper for AI-based visitor classification.
 * Calls the public classify endpoint to determine which
 * classifier option best matches a visitor's properties.
 */

import type { VisitorInfo } from "@core/types";

export async function classifyVisitor(
  tenantId: string,
  surveyId: string,
  visitorInfo: VisitorInfo,
  options: { id: string; label: string }[],
  spamFields?: { _hp?: string; _ts?: number },
): Promise<string | null> {
  try {
    const res = await fetch(
      `/api/data/tenants/${tenantId}/surveys/${surveyId}/classify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitorInfo,
          options,
          _hp: spamFields?._hp ?? "",
          _ts: spamFields?._ts ?? Date.now(),
        }),
      },
    );

    if (!res.ok) {
      console.error(
        "[DBG][survey-classify] API error:",
        res.status,
        res.statusText,
      );
      return null;
    }

    const json = await res.json();
    if (json.success && json.data?.optionId) {
      return json.data.optionId as string;
    }

    return null;
  } catch (error) {
    console.error("[DBG][survey-classify] Fetch error:", error);
    return null;
  }
}
