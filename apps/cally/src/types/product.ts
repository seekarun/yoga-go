/**
 * Product Types for CallyGo
 * Products/services that tenants offer in their catalog
 */

export interface ProductImage {
  id: string;
  url: string;
  position?: string;
  zoom?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  durationMinutes: number;
  price: number; // in smallest currency unit (cents)
  color?: string;
  /** @deprecated Use `images` array instead */
  image?: string;
  /** @deprecated Use `images` array instead */
  imagePosition?: string;
  /** @deprecated Use `images` array instead */
  imageZoom?: number;
  /** Multiple images per product */
  images?: ProductImage[];
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
