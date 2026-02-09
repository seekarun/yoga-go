// Visitor Types - Geolocation and metadata captured from request headers

/**
 * Visitor metadata captured from Vercel request headers.
 * Populated automatically by Vercel edge; empty in local dev.
 */
export interface VisitorInfo {
  ip?: string;
  country?: string; // ISO 3166-1 (e.g., "AU")
  region?: string; // ISO 3166-2 (e.g., "NSW")
  city?: string; // decoded city name
  timezone?: string; // IANA (e.g., "Australia/Sydney")
  latitude?: string;
  longitude?: string;
  userAgent?: string;
}
