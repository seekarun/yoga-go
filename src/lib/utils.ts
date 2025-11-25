import type { NextRequest } from 'next/server';

/**
 * Get the base URL from the request headers
 * Handles both localhost (http) and production (https)
 */
export function getBaseUrlFromRequest(request: NextRequest): string {
  const hostname = request.headers.get('host') || 'localhost:3111';
  const protocol = hostname.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${hostname}`;
}
