/**
 * GET /api/data/app/domain/search?q=mybusiness
 * Search for domain availability across supported TLDs + get suggestions
 */
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { checkDomainAvailability, getDomainSuggestions } from "@/lib/godaddy";
import type { DomainSearchResponse } from "@/types/domain";

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 },
      );
    }

    // Parse and validate query param
    const { searchParams } = new URL(request.url);
    const rawQuery = searchParams.get("q");

    if (!rawQuery || typeof rawQuery !== "string") {
      return NextResponse.json(
        { success: false, error: "Query parameter 'q' is required" },
        { status: 400 },
      );
    }

    // Sanitize: strip any TLD suffix, allow only alphanumeric + hyphens
    const sanitized = rawQuery
      .toLowerCase()
      .trim()
      .replace(/\.[a-z.]+$/, "") // strip TLD if user typed "foo.com"
      .replace(/[^a-z0-9-]/g, ""); // only alphanum and hyphens

    if (!sanitized || sanitized.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Domain name must be at least 2 characters (letters, numbers, hyphens)",
        },
        { status: 400 },
      );
    }

    if (sanitized.length > 63) {
      return NextResponse.json(
        {
          success: false,
          error: "Domain name is too long (max 63 characters)",
        },
        { status: 400 },
      );
    }

    console.log(
      "[DBG][domain/search] Searching for:",
      sanitized,
      "by user:",
      session.user.cognitoSub,
    );

    // Check availability and get suggestions in parallel
    const [results, suggestions] = await Promise.all([
      checkDomainAvailability(sanitized),
      getDomainSuggestions(sanitized),
    ]);

    const response: DomainSearchResponse = {
      query: sanitized,
      results,
      suggestions,
    };

    console.log(
      "[DBG][domain/search] Found",
      results.length,
      "results,",
      suggestions.length,
      "suggestions",
    );

    return NextResponse.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error("[DBG][domain/search] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}
