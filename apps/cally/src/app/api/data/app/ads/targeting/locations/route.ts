/**
 * Meta Location Targeting Search (Authenticated)
 * GET /api/data/app/ads/targeting/locations?q=sydney
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { ApiResponse } from "@/types";
import { auth } from "@/auth";
import { searchMetaLocations } from "@/lib/meta-ads";

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiResponse<Array<{ key: string; name: string; type: string }>>>
> {
  const query = request.nextUrl.searchParams.get("q");
  console.log(`[DBG][ads/targeting/locations] GET q=${query}`);

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

    const results = await searchMetaLocations(query.trim());

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("[DBG][ads/targeting/locations] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search locations" },
      { status: 500 },
    );
  }
}
