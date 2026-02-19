/**
 * Admin API: Toggle template published/development status
 * POST /api/supa/templates
 * Body: { templateId: string, status: "published" | "development" }
 *
 * Modifies the TEMPLATES array in landing-page.ts source file.
 * Localhost only (enforced by middleware + defense-in-depth check).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const LOG_PREFIX = "[DBG][api/supa/templates]";

const LANDING_PAGE_TS = join(process.cwd(), "src/types/landing-page.ts");

function isLocalhost(request: NextRequest): boolean {
  const hostname = request.headers.get("host") || "";
  const host = hostname.split(":")[0];
  return host === "localhost" || host === "127.0.0.1";
}

export async function POST(request: NextRequest) {
  // Defense-in-depth: double-check localhost
  if (!isLocalhost(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { templateId, status } = await request.json();

    if (!templateId || !["published", "development"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid templateId or status" },
        { status: 400 },
      );
    }

    console.log(`${LOG_PREFIX} Toggling template "${templateId}" → ${status}`);

    const source = await readFile(LANDING_PAGE_TS, "utf-8");

    // Match the template block by its id and replace the status line.
    // Pattern: find `id: "templateId"` then the next `status: "..."` line.
    const idPattern = new RegExp(
      `(id:\\s*"${templateId}"[\\s\\S]*?status:\\s*")(?:published|development)(")`,
    );

    if (!idPattern.test(source)) {
      return NextResponse.json(
        { error: `Template "${templateId}" not found in source` },
        { status: 404 },
      );
    }

    const updated = source.replace(idPattern, `$1${status}$2`);
    await writeFile(LANDING_PAGE_TS, updated, "utf-8");

    console.log(`${LOG_PREFIX} Updated ${templateId} to ${status}`);
    return NextResponse.json({ success: true, templateId, status });
  } catch (error) {
    console.error(`${LOG_PREFIX} Error updating template status:`, error);
    return NextResponse.json(
      { error: "Failed to update template status" },
      { status: 500 },
    );
  }
}
