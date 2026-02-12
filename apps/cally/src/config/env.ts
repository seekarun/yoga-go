/**
 * Environment-based configuration for CallyGo
 */

// Local development port
export const LOCAL_PORT = process.env.PORT || "3113";

// Whether we're in production
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

// Protocol based on environment
export const PROTOCOL = IS_PRODUCTION ? "https" : "http";

// Base URL for the app
export const BASE_URL = IS_PRODUCTION
  ? `https://${process.env.NEXT_PUBLIC_DOMAIN || "cally.app"}`
  : `http://localhost:${LOCAL_PORT}`;

// Cookie domain (undefined for localhost)
export const COOKIE_DOMAIN = IS_PRODUCTION
  ? `.${process.env.NEXT_PUBLIC_DOMAIN || "cally.app"}`
  : undefined;
