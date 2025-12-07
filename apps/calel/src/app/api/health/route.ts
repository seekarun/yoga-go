import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "calel",
    timestamp: new Date().toISOString(),
  });
}
