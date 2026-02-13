/**
 * Meta Interest Targeting Search (Authenticated)
 * GET /api/data/app/ads/targeting/interests?q=yoga
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { searchMetaInterests } from "@/lib/meta-ads";

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<Array<{ id: string; name: string }>>>> {
  const query = request.nextUrl.searchParams.get("q");
  console.log(`[DBG][ads/targeting/interests] GET q=${query}`);

  try {
    const session = await auth();
    if (!session?.user?.cognitoSub) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Query must be at least 2 characters" },
        { status: 400 },
      );
    }

    const results = await searchMetaInterests(query.trim());

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("[DBG][ads/targeting/interests] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search interests" },
      { status: 500 },
    );
  }
}
