// Asset Types - File and media asset types

import type { BaseEntity } from "./base";

/**
 * Asset type
 */
export type AssetType = "image" | "video" | "document";

/**
 * Asset category
 */
export type AssetCategory =
  | "avatar"
  | "banner"
  | "thumbnail"
  | "course"
  | "lesson"
  | "about"
  | "logo"
  | "blog_cover"
  | "blog_inline"
  | "blog_attachment"
  | "value_prop"
  | "other";

/**
 * Asset dimensions
 */
export interface AssetDimensions {
  width: number;
  height: number;
}

/**
 * Crop data for image editing
 */
export interface CropData {
  x: number;
  y: number;
  width: number;
  height: number;
  zoom?: number;
}

/**
 * Asset entity
 */
export interface Asset extends BaseEntity {
  tenantId: string;
  filename: string;
  originalUrl: string;
  croppedUrl?: string;
  cloudflareImageId: string;
  croppedCloudflareImageId?: string;
  type: AssetType;
  category: AssetCategory;
  dimensions: AssetDimensions;
  cropData?: CropData;
  size: number;
  mimeType: string;
  uploadedBy?: string;
  relatedTo?: {
    type: "expert" | "user" | "course" | "lesson";
    id: string;
  };
  metadata?: Record<string, unknown>;
}
