/**
 * POST /api/data/app/tenant/landing-page/ai-edit
 * Generate AI-powered landing page edits (authenticated)
 *
 * TODO: WIP — depends on LandingPageConfig V2 types not yet implemented.
 */
import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { success: false, error: "AI edit is not yet available" },
    { status: 501 },
  );
}
