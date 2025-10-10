import { NextResponse } from 'next/server';
import type { ApiResponse } from '@/types';
import { getAllExperts } from '@/store/experts';

export async function GET() {
  console.log('[DBG][experts/route.ts] GET /data/experts called');

  const experts = getAllExperts();

  const response: ApiResponse<typeof experts> = {
    success: true,
    data: experts,
    total: experts.length,
  };

  return NextResponse.json(response);
}
