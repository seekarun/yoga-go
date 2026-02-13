/**
 * Google Business Profile integration types
 */

export interface GoogleBusinessConfig {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string; // ISO 8601
  email: string; // Google account email
  accountId: string; // "accounts/123456"
  locationId: string; // "locations/789"
  locationName: string; // "My Yoga Studio - Sydney"
  connectedAt: string; // ISO 8601
}

export interface GoogleReview {
  reviewId: string;
  reviewer: { displayName: string; profilePhotoUrl?: string };
  starRating: "ONE" | "TWO" | "THREE" | "FOUR" | "FIVE";
  comment?: string;
  createTime: string;
  updateTime: string;
  reviewReply?: { comment: string; updateTime: string };
}

export interface GoogleReviewsResponse {
  reviews: GoogleReview[];
  averageRating: number;
  totalReviewCount: number;
  nextPageToken?: string;
}
