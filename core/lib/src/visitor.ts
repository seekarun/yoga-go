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
  if (userAgent) {
    info.userAgent = userAgent;
    info.deviceType = parseDeviceType(userAgent);
    info.browser = parseBrowser(userAgent);
    info.os = parseOS(userAgent);
  }

  // Primary language from Accept-Language header
  const acceptLang = headers.get("accept-language");
  if (acceptLang) {
    const primary = acceptLang.split(",")[0].split(";")[0].trim();
    if (primary) info.language = primary;
  }

  // Referrer hostname
  const referer = headers.get("referer");
  if (referer) {
    try {
      info.referrer = new URL(referer).hostname;
    } catch {
      info.referrer = referer;
    }
  }

  return info;
}

/** Extract device type from user-agent string */
function parseDeviceType(ua: string): string {
  if (/Tablet|iPad/i.test(ua)) return "tablet";
  if (/Mobile|iPhone|Android.*Mobile/i.test(ua)) return "mobile";
  return "desktop";
}

/** Extract browser name from user-agent string */
function parseBrowser(ua: string): string {
  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Firefox\//i.test(ua)) return "Firefox";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  return "Other";
}

/** Extract OS name from user-agent string */
function parseOS(ua: string): string {
  if (/iPhone|iPad|iPod/i.test(ua)) return "iOS";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac OS X|macOS/i.test(ua)) return "macOS";
  if (/Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(ua)) return "Linux";
  return "Other";
}
