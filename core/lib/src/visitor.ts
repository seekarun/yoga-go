// Visitor Info - Extract geolocation and metadata from Vercel request headers

import type { VisitorInfo } from "@core/types";

/**
 * Extract visitor geolocation and metadata from request headers.
 * Vercel automatically populates x-vercel-ip-* headers on every request.
 * Returns only non-empty fields.
 */
export function extractVisitorInfo(headers: Headers): VisitorInfo {
  const info: VisitorInfo = {};

  // IP — take first from comma-separated x-forwarded-for list
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const firstIp = xff.split(",")[0].trim();
    if (firstIp) info.ip = firstIp;
  }

  // Vercel geo headers
  const country = headers.get("x-vercel-ip-country");
  if (country) info.country = country;

  const region = headers.get("x-vercel-ip-country-region");
  if (region) info.region = region;

  // City is URL-encoded for non-ASCII characters
  const city = headers.get("x-vercel-ip-city");
  if (city) {
    try {
      info.city = decodeURIComponent(city);
    } catch {
      info.city = city;
    }
  }

  const timezone = headers.get("x-vercel-ip-timezone");
  if (timezone) info.timezone = timezone;

  const latitude = headers.get("x-vercel-ip-latitude");
  if (latitude) info.latitude = latitude;

  const longitude = headers.get("x-vercel-ip-longitude");
  if (longitude) info.longitude = longitude;

  // Browser user-agent
  const userAgent = headers.get("user-agent");
  if (userAgent) info.userAgent = userAgent;

  return info;
}
