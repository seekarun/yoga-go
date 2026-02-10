/**
 * Zoom integration types
 */

export interface ZoomConfig {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string; // ISO 8601
  email: string; // Zoom account email
  connectedAt: string; // ISO 8601
}
